import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";
import { loadTasks } from "@/lib/store";
import { dotGet } from "@/lib/jsonPath";

export const runtime = "nodejs";

function toUnixSeconds(d: Date): number { return Math.floor(d.getTime() / 1000); }

function isLowercaseHexAddress(a: string): boolean {
  return /^0x[0-9a-f]{40}$/.test(a);
}

export async function GET(req: Request){
  try {
    const url = new URL(req.url);
    const addressRaw = String(url.searchParams.get("address") || "").trim();
    const address = addressRaw.toLowerCase();
    const debug = /^(1|true)$/i.test(String(url.searchParams.get("debug") || ""));
    const onlyWeekParam = url.searchParams.get("week");
    const onlyWeek = onlyWeekParam ? Number(onlyWeekParam) : NaN; // 1-based
    const unlockTest = /^(1|true)$/i.test(String(url.searchParams.get("unlock_test") || ""));
    if (!isLowercaseHexAddress(address)){
      return NextResponse.json({ error: { code: "INVALID_ADDRESS", message: "Invalid Ethereum address format" } }, { status: 400 });
    }

    // Load spec (tasks + program timing)
    const spec = await loadTasks();
    const allTasks = spec.tasks || [];
    const totalWeeks = Math.max(1, Number(spec.weeks || 8));

    // Compute quest timeline
    const startIso = spec.programStart;
    const start = startIso ? new Date(startIso) : null;
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;
    const weeksMs = 7 * dayMs;
    let currentWeek = 0; // 0-based
    if (start && !isNaN(start.getTime())){
      const elapsedMs = Math.max(0, now.getTime() - start.getTime());
      currentWeek = Math.min(totalWeeks - 1, Math.floor(elapsedMs / weeksMs));
    }
    const endAt = start ? toUnixSeconds(new Date(start.getTime() + totalWeeks * weeksMs)) : toUnixSeconds(new Date(now.getTime() + totalWeeks * weeksMs));

    // Collect mandatory task ids per week
    const mandatoryByWeek: string[][] = Array.from({ length: totalWeeks }, () => []);
    for (const t of allTasks){
      const w = (t as { week?: number }).week;
      const id = (t as { id?: string }).id || "";
      const isMandatory = ((t as unknown as Record<string, unknown>)?.["mandatory"] === true) || ((t as unknown as Record<string, unknown>)?.["mandatory task"] === true);
      if (!id) continue;
      if (typeof w === 'number' && w >= 1 && w <= totalWeeks){
        const idx = w - 1;
        if (isMandatory) {
          const bucket = mandatoryByWeek[idx] || [];
          bucket.push(id);
          mandatoryByWeek[idx] = bucket;
        }
      }
    }

    // Read verified task ids for address from Redis
    const verifiedRes = await pipeline([["SMEMBERS", `user:verified:${address}`]]);
    let verified: string[] = [];
    try {
      const raw = (verifiedRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(raw)) {
        const bucket = raw[0]?.result as unknown;
        if (Array.isArray(bucket)) verified = (bucket as unknown[]).map(String);
        else if (typeof bucket === 'string') verified = bucket.split(',').map((s) => s.trim()).filter(Boolean);
      } else if (raw && Array.isArray(raw.result)) {
        const bucket = raw.result[0]?.result as unknown;
        if (Array.isArray(bucket)) verified = (bucket as unknown[]).map(String);
        else if (typeof bucket === 'string') verified = bucket.split(',').map((s) => s.trim()).filter(Boolean);
      }
    } catch { verified = []; }

    // Normalize verified list: handle cases where backend returns a single comma-joined string or mixed
    const verifiedFlat: string[] = [];
    for (const v of verified) {
      const s = String(v || "").trim();
      if (!s) continue;
      if (s.includes(',')) {
        for (const part of s.split(',')) {
          const p = part.trim(); if (p) verifiedFlat.push(p);
        }
      } else {
        verifiedFlat.push(s);
      }
    }
    const verifiedSet = new Set(verifiedFlat);

    // Each week gives up to 10% proportionally to completed mandatory tasks
    const capPerWeek = 10;
    // In production, cap visible/progress week to 7 (idx 6)
    const isProd = process.env.NODE_ENV === 'production';
    const effectiveCurrentWeek = isProd ? Math.min(currentWeek, 6) : currentWeek;

    // Week 7 mandatory override for production: use exactly these two IDs
    // to maintain 0/5/10% mapping for two mandatory tasks
    if (isProd) {
      try {
        mandatoryByWeek[6] = ["somniameme-trade-2", "tokos-supply-30"];
      } catch { /* noop */ }
    }

    const weeks = mandatoryByWeek.map((ids, idx) => {
      // Do not unlock for future weeks relative to effective current week
      if (idx > effectiveCurrentWeek) return { unlockedPercentage: 0 };
      const list = Array.isArray(ids) ? ids : [];
      if (list.length === 0) return { unlockedPercentage: 0 };
      const completed = list.reduce((n, id) => n + (verifiedSet.has(id) ? 1 : 0), 0);
      const pctRaw = (completed * capPerWeek) / list.length;
      const pct = Math.max(0, Math.min(capPerWeek, pctRaw));
      return { unlockedPercentage: pct };
    });

    // Optionally compute Week 3 via external APIs (no persistence), for local testing
    if (unlockTest) {
      try {
        // Build a quick lookup of tasks by id
        const tasksById = Object.create(null) as Record<string, Record<string, unknown>>;
        for (const t of allTasks){
          const id = (t as { id?: string }).id || "";
          if (id) tasksById[id] = t as unknown as Record<string, unknown>;
        }
        const week3Idx = 2; // zero-based index
        const ids = mandatoryByWeek[week3Idx] || [];
        let extCompleted = 0;
        for (const id of ids){
          if (verifiedSet.has(id)) { extCompleted += 1; continue; }
          const task = tasksById[id];
          const vp = (task?.["verify_params"] as Record<string, unknown>) || {};
          const cfg = (vp["verify_api"] as Record<string, unknown>) || {};
          const rawUrl = String(cfg["url"] || "").trim();
          const method = String(cfg["method"] || "GET").toUpperCase();
          const success = (cfg["success"] || {}) as { path?: string; equals?: unknown; length_gt?: number };
          if (!rawUrl) continue;
          const urlFinal = rawUrl
            .replace(":userAddress", addressRaw || address)
            .replace(":walletAddress", addressRaw || address)
            .replace(":address", addressRaw || address);
          const init: RequestInit = { headers: { "Accept": "application/json", "User-Agent": "Somnia-Odyssey/1.0", "Origin": "https://odyssey.somnia.network" } };
          if (method === "POST") init.method = "POST"; else init.method = "GET";
          const headersCfg = cfg["headers"] as Record<string, unknown> | undefined;
          if (headersCfg && typeof headersCfg === "object"){
            for (const [k, v] of Object.entries(headersCfg)){
              (init.headers as Record<string, string>)[k] = String(v);
            }
          }
          try {
            const res = await fetch(urlFinal, init);
            if (!res.ok) continue;
            const dataUnknown: unknown = await res.json().catch(() => ({}));
            const obj = (dataUnknown ?? {}) as Record<string, unknown>;
            let ok = false;
            if (success && typeof success === "object"){
              if (success.path){
                const val = dotGet(obj, String(success.path));
                if (success.length_gt != null && Array.isArray(val)){
                  ok = val.length > Number(success.length_gt);
                } else if (success.equals !== undefined) {
                  ok = val === success.equals;
                } else {
                  ok = Boolean(val);
                }
              } else {
                ok = Boolean(obj["completed"] === true || obj["ok"] === true || obj["verified"] === true);
              }
            } else {
              ok = Boolean(obj["completed"] === true || obj["ok"] === true || obj["verified"] === true);
            }
            if (ok) extCompleted += 1;
          } catch { /* ignore */ }
        }
        const listLen = (mandatoryByWeek[week3Idx] || []).length;
        if (listLen > 0){
          const pct = Math.max(0, Math.min(capPerWeek, (extCompleted * capPerWeek) / listLen));
          weeks[week3Idx] = { unlockedPercentage: pct };
        }
      } catch { /* ignore */ }
    }

    // Optionally compute Week 6 via external APIs (no persistence), for local testing
    if (unlockTest) {
      try {
        const tasksById = Object.create(null) as Record<string, Record<string, unknown>>;
        for (const t of allTasks){
          const id = (t as { id?: string }).id || "";
          if (id) tasksById[id] = t as unknown as Record<string, unknown>;
        }
        const week6Idx = 5; // zero-based index for week 6
        const ids = mandatoryByWeek[week6Idx] || [];
        let extCompleted = 0;
        for (const id of ids){
          if (verifiedSet.has(id)) { extCompleted += 1; continue; }
          const task = tasksById[id];
          const vp = (task?.["verify_params"] as Record<string, unknown>) || {};
          const cfg = (vp["verify_api"] as Record<string, unknown>) || {};
          const rawUrl = String(cfg["url"] || "").trim();
          const method = String(cfg["method"] || "GET").toUpperCase();
          const success = (cfg["success"] || {}) as { path?: string; equals?: unknown; length_gt?: number };
          if (!rawUrl) continue;
          const urlFinal = rawUrl
            .replace(":userAddress", addressRaw || address)
            .replace(":walletAddress", addressRaw || address)
            .replace(":address", addressRaw || address)
            .replace(":timestamp", String(Math.floor(Date.now()/1000)));
          const init: RequestInit = { headers: { "Accept": "application/json", "User-Agent": "Somnia-Odyssey/1.0", "Origin": "https://odyssey.somnia.network" } };
          if (method === "POST") init.method = "POST"; else init.method = "GET";
          const headersCfg = cfg["headers"] as Record<string, unknown> | undefined;
          if (headersCfg && typeof headersCfg === "object"){
            for (const [k, v] of Object.entries(headersCfg)){
              (init.headers as Record<string, string>)[k] = String(v);
            }
          }
          try {
            const res = await fetch(urlFinal, init);
            if (!res.ok) continue;
            const dataUnknown: unknown = await res.json().catch(() => ({}));
            const obj = (dataUnknown ?? {}) as Record<string, unknown>;
            let ok = false;
            if (success && typeof success === "object"){
              if (success.path){
                const val = dotGet(obj, String(success.path));
                if (success.length_gt != null && Array.isArray(val)){
                  ok = val.length > Number(success.length_gt);
                } else if (success.equals !== undefined) {
                  ok = val === success.equals;
                } else {
                  ok = Boolean(val);
                }
              } else {
                ok = Boolean(obj["completed"] === true || obj["ok"] === true || obj["verified"] === true);
              }
            } else {
              ok = Boolean(obj["completed"] === true || obj["ok"] === true || obj["verified"] === true);
            }
            if (ok) extCompleted += 1;
          } catch { /* ignore */ }
        }
        const listLen = (mandatoryByWeek[week6Idx] || []).length;
        if (listLen > 0){
          const pct = Math.max(0, Math.min(capPerWeek, (extCompleted * capPerWeek) / listLen));
          weeks[week6Idx] = { unlockedPercentage: pct };
        }
      } catch { /* ignore */ }
    }

    // Optionally compute Week 7 via external APIs (no persistence), for local testing
    if (unlockTest) {
      try {
        const tasksById = Object.create(null) as Record<string, Record<string, unknown>>;
        for (const t of allTasks){
          const id = (t as { id?: string }).id || "";
          if (id) tasksById[id] = t as unknown as Record<string, unknown>;
        }
        const week7Idx = 6; // zero-based index for week 7
        // Dev-only override: use EXACTLY these two as mandatory for week 7 testing
        // per spec: somniameme-trade-2 and tokos-supply (tokos-supply-30 in tasks)
        const ids = ["somniameme-trade-2", "tokos-supply-30"];
        let extCompleted = 0;
        for (const id of ids){
          if (verifiedSet.has(id)) { extCompleted += 1; continue; }
          const task = tasksById[id];
          const vp = (task?.["verify_params"] as Record<string, unknown>) || {};
          const cfg = (vp["verify_api"] as Record<string, unknown>) || {};
          const rawUrl = String(cfg["url"] || "").trim();
          const method = String(cfg["method"] || "GET").toUpperCase();
          const success = (cfg["success"] || {}) as { path?: string; equals?: unknown; length_gt?: number };
          if (!rawUrl) continue;
          const urlFinal = rawUrl
            .replace(":userAddress", addressRaw || address)
            .replace(":walletAddress", addressRaw || address)
            .replace(":address", addressRaw || address)
            .replace(":timestamp", String(Math.floor(Date.now()/1000)));
          const init: RequestInit = { headers: { "Accept": "application/json", "User-Agent": "Somnia-Odyssey/1.0", "Origin": "https://odyssey.somnia.network" } };
          if (method === "POST") init.method = "POST"; else init.method = "GET";
          const headersCfg = cfg["headers"] as Record<string, unknown> | undefined;
          if (headersCfg && typeof headersCfg === "object"){
            for (const [k, v] of Object.entries(headersCfg)){
              (init.headers as Record<string, string>)[k] = String(v);
            }
          }
          try {
            const res = await fetch(urlFinal, init);
            if (!res.ok) continue;
            const dataUnknown: unknown = await res.json().catch(() => ({}));
            const obj = (dataUnknown ?? {}) as Record<string, unknown>;
            let ok = false;
            if (success && typeof success === "object"){
              if (success.path){
                const val = dotGet(obj, String(success.path));
                if (success.length_gt != null && Array.isArray(val)){
                  ok = val.length > Number(success.length_gt);
                } else if (success.equals !== undefined) {
                  ok = val === success.equals;
                } else {
                  ok = Boolean(val);
                }
              } else {
                ok = Boolean(obj["completed"] === true || obj["ok"] === true || obj["verified"] === true);
              }
            } else {
              ok = Boolean(obj["completed"] === true || obj["ok"] === true || obj["verified"] === true);
            }
            if (ok) extCompleted += 1;
          } catch { /* ignore */ }
        }
        const listLen = ids.length;
        if (listLen > 0){
          const pct = Math.max(0, Math.min(capPerWeek, (extCompleted * capPerWeek) / listLen));
          weeks[week7Idx] = { unlockedPercentage: pct };
        }
      } catch { /* ignore */ }
    }

    // Hard lock in production: allow Weeks 1–7; subsequent weeks must be 0
    if (isProd) {
      weeks.forEach((w, idx) => { if (idx > 6) w.unlockedPercentage = 0; });
    }
    const totalUnlockedPercentage = weeks.reduce((s, w) => s + (w.unlockedPercentage || 0), 0);

    // Report currentWeek as 1-based in API response (capped in production above)
    const payload: Record<string, unknown> = { totalUnlockedPercentage, currentWeek: effectiveCurrentWeek + 1, endAt, weeks };
    if (debug) {
      payload.debug = {
        mandatoryByWeek,
        verifiedIds: Array.from(verifiedSet),
      };
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "An internal server error occurred" } }, { status: 500 });
  }
}


