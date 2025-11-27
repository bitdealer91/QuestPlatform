import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export const runtime = "nodejs";

type Body = { token?: string; address?: string };

export async function POST(req: Request){
  try {
    const body = (await req.json().catch(() => ({}))) as Body;
    const token = String(body.token || "");
    const addressRaw = String(body.address || "").toLowerCase();

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
    if (!/^0x[0-9a-f]{40}$/.test(addressRaw)) {
      return NextResponse.json({ error: "bad_address" }, { status: 400 });
    }

    const addr = addressRaw;
    // Load active reservation nonces to cleanup their keys
    let nonces: string[] = [];
    try {
      const members = await pipeline([["SMEMBERS", `user:stars_resv_nonces:${addr}`]]);
      const rawM = (members as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(rawM)) {
        const arr = rawM[0]?.result as unknown;
        if (Array.isArray(arr)) nonces = (arr as unknown[]).map(String);
      } else if (rawM && Array.isArray(rawM.result)) {
        const bucket = rawM.result[0]?.result as unknown;
        if (Array.isArray(bucket)) nonces = (bucket as unknown[]).map(String);
      }
    } catch { nonces = []; }

    const cmds: (string|number)[][] = [];
    // Clear one-time signature lock
    cmds.push(["DEL", `user:stars_signed_once:${addr}`]);
    // Clear active reservations
    cmds.push(["DEL", `user:stars_resv_nonces:${addr}`]);
    for (const n of nonces) {
      cmds.push(["DEL", `user:stars_resv:${addr}:${String(n)}`]);
    }
    const res = await pipeline(cmds);
    return NextResponse.json({ ok: true, clearedReservations: nonces.length, result: res });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500 });
  }
}


