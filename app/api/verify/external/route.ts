import { NextResponse } from "next/server";
import { findTask } from "@/lib/store";
import { dotGet } from "@/lib/jsonPath";
import { getCache as globalGetCache, setCache as globalSetCache } from "@/lib/cache";
import { coalesce } from "@/lib/inflight";
import { limitIp, limitPair } from "@/lib/rateLimit";
import { Address, createPublicClient, http, parseAbi } from "viem";

export const runtime = "nodejs";

function getNow() { return Date.now(); }


// Rate limiting (very simple token buckets in-memory). For production add Redis.
const rlPerIp = new Map<string, { tokens: number; resetAt: number }>();
const rlPerPair = new Map<string, { tokens: number; resetAt: number }>();
function checkRl(map: Map<string, { tokens: number; resetAt: number }>, key: string, limit: number){
  const now = getNow();
  let b = map.get(key);
  if (!b || b.resetAt <= now){ b = { tokens: limit, resetAt: now + 60_000 }; map.set(key, b); }
  if (b.tokens <= 0) return { limited: true, retryAfter: Math.ceil((b.resetAt - now)/1000) };
  b.tokens -= 1; return { limited: false, retryAfter: Math.ceil((b.resetAt - now)/1000) };
}

function tmpl(obj:any, ctx:Record<string,string>) {
  if (!obj) return undefined;
  const s = JSON.stringify(obj);
  return JSON.parse(
    s.replace(/{{address}}/g, ctx.address)
     .replace(/{{taskId}}/g,  ctx.taskId)
     .replace(/{{txHash}}/g,  ctx.txHash || "")
     .replace(/{{API_BEARER}}/g, process.env.API_BEARER || "")
  );
}
function withAddressInUrl(url:string, addr:string){
  if (url.includes("{{address}}")) return url.replace(/{{address}}/g, addr);
  const hasQuery = url.includes("?");
  return `${url}${hasQuery ? "&" : "?"}wallet=${addr}`;
}

async function fetchWithTimeout(url: string, init: RequestInit & { timeoutMs?: number }){
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 5000);
  try {
    const res = await fetch(url, { ...init, signal: controller.signal });
    return res;
  } finally { clearTimeout(timeout); }
}

async function fetchPartner({ api, lower, taskId, txHash }:{ api:any; lower:string; taskId:string; txHash?:string }){
  const method = api.method || "GET";
  const headers = tmpl(api.headers, { address: lower, taskId, txHash });
  let url = api.url;
  if (method === "GET"){
    url = withAddressInUrl(api.url, lower);
  } else if (api.url.includes("{{address}}")){
    url = api.url.replace(/{{address}}/g, lower);
  }
  const body = api.body ? JSON.stringify(tmpl(api.body, { address: lower, taskId, txHash })) : undefined;
  const res = await fetchWithTimeout(url, { method, headers, body, timeoutMs: 5000 });
  if (res.status === 429 || res.status >= 500){
    const err = new Error(`Upstream ${res.status}`);
    (err as any).status = res.status;
    throw err;
  }
  let data: any = {};
  try { data = await res.json(); } catch { data = {}; }
  const ok = api.success
    ? dotGet(data, api.success.path) === api.success.equals
    : dotGet(data, "completed") === true;
  const wallet = data.wallet ?? lower;
  const score  = data.score;
  return { wallet, score, completed: !!ok, raw: data };
}

// --------------------
// On-chain verification
// --------------------
function getRpcUrl(fallback?: string){
  return fallback || process.env.NEXT_PUBLIC_RPC_URL || "https://dream-rpc.somnia.network";
}

function normalizeAddress(addr: string){
  return String(addr || "").toLowerCase();
}

async function verifyOnchain(params: any, walletLower: string){
  const rpcUrl = getRpcUrl(params?.rpcUrl);
  const client = createPublicClient({ transport: http(rpcUrl) });

  const contract = params?.contract as Address | undefined;
  if (!contract) return { wallet: walletLower, completed: false };

  const check = params?.check as string | undefined;
  if (check === "ownership"){
    const standard = String(params?.standard || "erc721").toLowerCase();
    if (standard === "erc1155"){
      const tokenIdRaw = params?.tokenId;
      if (tokenIdRaw == null) return { wallet: walletLower, completed: false };
      const tokenId = typeof tokenIdRaw === "bigint" ? tokenIdRaw : BigInt(String(tokenIdRaw));
      const minAmount = Number(params?.minAmount ?? 1);
      const abi = parseAbi([
        "function balanceOf(address account, uint256 id) view returns (uint256)",
      ]);
      try {
        const balance = await client.readContract({
          address: contract,
          abi,
          functionName: "balanceOf",
          args: [walletLower as Address, tokenId],
        });
        const ok = (balance as bigint) >= BigInt(minAmount);
        return { wallet: walletLower, completed: ok };
      } catch {
        return { wallet: walletLower, completed: false };
      }
    } else { // erc721
      const abi = parseAbi([
        "function balanceOf(address owner) view returns (uint256)",
        "function ownerOf(uint256 tokenId) view returns (address)",
      ]);
      try {
        if (params?.tokenId != null){
          const tokenId = typeof params.tokenId === "bigint" ? params.tokenId : BigInt(String(params.tokenId));
          const owner = await client.readContract({
            address: contract,
            abi,
            functionName: "ownerOf",
            args: [tokenId],
          });
          const ok = normalizeAddress(String(owner)) === walletLower;
          return { wallet: walletLower, completed: ok };
        }
        const bal = await client.readContract({
          address: contract,
          abi,
          functionName: "balanceOf",
          args: [walletLower as Address],
        });
        const ok = (bal as bigint) > 0n;
        return { wallet: walletLower, completed: ok };
      } catch {
        return { wallet: walletLower, completed: false };
      }
    }
  }

  if (check === "call"){
    // Expect either `abi`+`functionName` or a single `function` signature string
    const abiStrings: string[] | undefined = params?.abi || (params?.function ? [
      String(params.function).startsWith("function ") ? String(params.function) : `function ${String(params.function)}`
    ] : undefined);
    if (!abiStrings || abiStrings.length === 0) return { wallet: walletLower, completed: false };
    const abi = parseAbi(abiStrings);
    let fnName: string | undefined = params?.functionName;
    if (!fnName && params?.function) {
      const f = String(params.function);
      const i = f.indexOf("(");
      fnName = i > 0 ? f.slice(0, i).replace(/^function\s+/, "") : undefined;
    }
    if (!fnName) return { wallet: walletLower, completed: false };

    const rawArgs: any[] = Array.isArray(params?.args) ? params.args : [];
    const args = rawArgs.map((a) => {
      if (typeof a === "string"){
        const replaced = a.replace(/{{address}}/g, walletLower).replace(/{{WALLET}}/g, walletLower);
        if (/^\d+$/.test(replaced)) return BigInt(replaced);
        return replaced;
      }
      return a;
    });

    try {
      const result = await client.readContract({ address: contract, abi, functionName: fnName as any, args });
      const rule = params?.returns;
      if (!rule) return { wallet: walletLower, completed: !!result };
      const value = rule?.path ? dotGet(result as any, String(rule.path)) : result;
      if ("equals" in rule) return { wallet: walletLower, completed: value === rule.equals };
      if ("gte" in rule) return { wallet: walletLower, completed: (typeof value === "bigint" ? value : BigInt(String(value))) >= BigInt(rule.gte) };
      return { wallet: walletLower, completed: false };
    } catch {
      return { wallet: walletLower, completed: false };
    }
  }

  if (check === "transfer_event"){
    // Use Somnia W3US API directly for verification
    try {
      console.log(`[DEBUG] Checking transfer_event for wallet: ${walletLower}, contract: ${contract}`);
      console.log(`[DEBUG] Using Somnia W3US API directly...`);
      
      // Check user's token transfers for this contract
      const tokenTransfersUrl = `https://somnia.w3us.site/api/v2/addresses/${walletLower}/token-transfers?token=${contract}`;
      console.log(`[DEBUG] Checking: ${tokenTransfersUrl}`);
      
      const tokenTransfersResponse = await fetch(tokenTransfersUrl);
      console.log(`[DEBUG] API response status: ${tokenTransfersResponse.status}`);
      
      if (tokenTransfersResponse.ok) {
        const tokenTransfers = await tokenTransfersResponse.json();
        console.log(`[DEBUG] Found ${tokenTransfers.items?.length || 0} token transfers`);
        
        if (tokenTransfers.items && tokenTransfers.items.length > 0) {
          // Check if any transfer involves the user receiving tokens
          const userReceivedTokens = tokenTransfers.items.some((transfer: any) => {
            const isMinting = transfer.from.hash === '0x0000000000000000000000000000000000000000';
            const isToUser = transfer.to.hash.toLowerCase() === walletLower.toLowerCase();
            const isMintingType = transfer.type === 'token_minting';
            
            console.log(`[DEBUG] Transfer check:`, { 
              from: transfer.from.hash, 
              to: transfer.to.hash, 
              type: transfer.type,
              isMinting, 
              isToUser, 
              isMintingType 
            });
            
            return isMinting && isToUser && isMintingType;
          });
          
          console.log(`[DEBUG] User received tokens check result: ${userReceivedTokens}`);
          
          if (userReceivedTokens) {
            console.log(`[DEBUG] User received tokens from minting, quest completed`);
            return { wallet: walletLower, completed: true };
          }
        }
      } else {
        console.log(`[DEBUG] API request failed with status: ${tokenTransfersResponse.status}`);
      }
      
      console.log(`[DEBUG] Could not verify through API, quest not completed`);
      return { wallet: walletLower, completed: false };
    } catch (error) {
      console.log(`[DEBUG] Error in transfer_event check:`, error);
      return { wallet: walletLower, completed: false };
    }
  }

  return { wallet: walletLower, completed: false };
}

// Circuit breaker (simple, per upstream URL)
const cb = new Map<string, { failures: number; lastReset: number; openUntil: number }>();
function isCircuitOpen(url: string){
  const s = cb.get(url); if (!s) return false;
  return s.openUntil > getNow();
}
function markSuccess(url: string){ cb.set(url, { failures: 0, lastReset: getNow(), openUntil: 0 }); }
function markFailure(url: string){
  const now = getNow();
  const s = cb.get(url) || { failures: 0, lastReset: now, openUntil: 0 };
  if (now - s.lastReset > 60_000){ s.failures = 0; s.lastReset = now; }
  s.failures += 1;
  if (s.failures >= 10){ s.openUntil = now + 45_000; s.failures = 0; s.lastReset = now; }
  cb.set(url, s);
}

// Optional Redis (Upstash) for global cache
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
async function redisGet(key: string){
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const r = await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["GET", key]])
    });
    const j = await r.json();
    const arr = j?.result || j;
    const res = Array.isArray(arr) ? arr[0]?.result : undefined;
    if (!res) return null;
    return JSON.parse(res);
  } catch { return null; }
}
async function redisSet(key: string, value: any, ttlSec: number){
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/pipeline`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify([["SET", key, JSON.stringify(value), "EX", String(ttlSec)]])
    });
  } catch {}
}

export async function POST(req: Request){
  const started = getNow();
  const ip = (req.headers as any).get?.("x-forwarded-for") || (req as any).ip || "unknown";
  const { address, taskId, txHash, force } = await req.json().catch(()=> ({}));
  const lower = String(address || "").toLowerCase();
  if (!lower || !taskId){
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key: `verify:${taskId}:${lower}`, source: "invalid", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: false }));
    return NextResponse.json(resp);
  }

  const task = await findTask(taskId);
  if (!task) {
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key: `verify:${taskId}:${lower}`, source: "notfound", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: false }));
    return NextResponse.json(resp);
  }
  const key = `verify:${taskId}:${lower}`;

  // Rate limit checks
  const rlIp = await limitIp(String(ip), 60);
  if (rlIp.limited) return NextResponse.json({ rateLimited: true }, { status: 429, headers: { "Retry-After": String(rlIp.retryAfter) } });
  const rlKey = await limitPair(key, 10);
  if (rlKey.limited) return NextResponse.json({ rateLimited: true }, { status: 429, headers: { "Retry-After": String(rlKey.retryAfter) } });

  // Global cache (Redis) → Memory
  const redisHit = await globalGetCache(key);
  if (redisHit && !force){ // Пропускаем кэш если force=true
    const ttl = redisHit.completed ? 86400 : 15; // Уменьшаем кэш для неудачных попыток
    console.log(JSON.stringify({ key, source: "cache:redis", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: true }));
    return NextResponse.json({ ...redisHit, source: "cache" }, { headers: { "Cache-Control": `private, max-age=${ttl}${redisHit.completed ? ", immutable" : ""}` } });
  }
  // globalGetCache already checks local first with small TTL, then Redis

  if (task.verify_api && isCircuitOpen(task.verify_api.url)){
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key, source: "circuit", latency_ms: getNow()-started, status: 200, retries: 0, cache_hit: false }));
    return NextResponse.json({ ...resp, source: "circuit" }, { headers: { "Cache-Control": "private, max-age=30" } });
  }

  // Coalesce in-flight
  let attempts = 0; let result: any;
  try {
    result = await coalesce(key, async () => {
      // retries with backoff
      let attempt = 0; let last: any = null;
      const maxAttempts = 3;
      while (attempt < maxAttempts){
        try {
          if (task.verify_method === "onchain"){
            const res = await verifyOnchain(task.verify_params || {}, lower);
            return res;
          }
          if (task.verify_api){
            const res = await fetchPartner({ api: task.verify_api, lower, taskId, txHash });
            return res;
          }
          return { wallet: lower, completed: false };
        } catch (e: any){
          last = e; attempt++;
          if (attempt >= maxAttempts) throw last;
          const backoff = Math.floor(200 * Math.pow(2, attempt-1) + Math.random()*200);
          await new Promise(r => setTimeout(r, backoff));
        }
      }
      throw last;
    });
    if (task.verify_api) markSuccess(task.verify_api.url);
    attempts = 0;
  } catch (e:any){
    if (task.verify_api) markFailure(task.verify_api.url);
    attempts = 2;
    const resp = { wallet: lower, completed: false };
    console.log(JSON.stringify({ key, source: "error", latency_ms: getNow()-started, status: 200, retries: attempts, cache_hit: false }));
    return NextResponse.json(resp, { headers: { "Cache-Control": "private, max-age=15" } });
  }

  const ttl = result.completed ? 86400 : 15; // Уменьшаем кэш для неудачных попыток с 60 до 15 секунд
  await globalSetCache(key, result, ttl);
  console.log(JSON.stringify({ key, source: "live", latency_ms: getNow()-started, status: 200, retries: attempts, cache_hit: false }));
  return NextResponse.json({ ...result, source: "live" }, { headers: { "Cache-Control": `private, max-age=${ttl}${result.completed ? ", immutable" : ""}` } });
}


