import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";

export async function POST(req: Request){
  try {
    const body = await req.json().catch(() => ({}));
    const addressRaw = String((body?.address ?? '').toString() || '').toLowerCase();
    const token = String((body?.token ?? '').toString() || '');

    // Optional admin token guard: if ADMIN_TOKEN is set, require it
    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!addressRaw || !/^0x[0-9a-f]{40}$/.test(addressRaw)){
      return NextResponse.json({ error: 'bad_address' }, { status: 400 });
    }

    const addr = addressRaw;
    const cmds: (string | number)[][] = [];
    // Basic progress/verified/ledger
    cmds.push(["DEL", `user:xp:${addr}`]);
    cmds.push(["DEL", `user:verified:${addr}`]);
    cmds.push(["DEL", `ledger:${addr}:events`]);
    cmds.push(["DEL", `ledger:${addr}:counts`]);
    // Stars by week (1..8)
    for (let w = 1; w <= 8; w++){
      cmds.push(["DEL", `user:stars:${addr}:${w}`]);
    }
    const res = await pipeline(cmds);
    return NextResponse.json({ ok: true, result: res });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


