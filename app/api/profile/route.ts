import { NextResponse } from "next/server";
import { readRecent } from "@/lib/ledger";

async function redisPipeline(cmds: unknown[]){
  const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
  const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  const res = await fetch(`${REDIS_URL}/pipeline`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify(cmds)
  });
  if (!res.ok) return null;
  return await res.json().catch(() => null);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = (url.searchParams.get("address") || "").toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const data = await redisPipeline([
    ["GET", `user:xp:${address}`],
    ["SMEMBERS", `user:verified:${address}`],
  ]);

  let totalXp = 0;
  let verified: string[] = [];
  if (data && Array.isArray(data.result)){
    const [xpRes, verifiedRes] = data.result;
    const xpVal = xpRes?.result;
    totalXp = typeof xpVal === 'number' ? xpVal : Number(xpVal || 0) || 0;
    verified = Array.isArray(verifiedRes?.result) ? verifiedRes.result.map(String) : [];
  }

  const ledger = await readRecent(address, 50);

  return NextResponse.json({ address, totalXp, verified, ledger });
}
