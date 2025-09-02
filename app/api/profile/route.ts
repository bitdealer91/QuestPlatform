import { NextResponse } from "next/server";
import { readRecent } from "@/lib/ledger";
import { pipeline } from "@/lib/redis";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const address = (url.searchParams.get("address") || "").toLowerCase();
  if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

  const data = await pipeline([
    ["GET", `user:xp:${address}`],
    ["SMEMBERS", `user:verified:${address}`],
  ]);

  let totalXp = 0;
  let verified: string[] = [];
  if (data && Array.isArray(data.result)){
    const first = data.result[0]?.result as unknown[] | undefined;
    const second = data.result[1]?.result as unknown[] | undefined;
    const xpVal = first?.[0];
    totalXp = typeof xpVal === 'number' ? xpVal : Number(xpVal || 0) || 0;
    verified = Array.isArray(second) ? second.map(String) : [];
  }

  // Stars by week (SCARD for user:stars:{address}:{week})
  const starCmds = Array.from({ length: 8 }, (_, i) => ["SCARD", `user:stars:${address}:${i + 1}`] as (string|number)[]);
  const starRes = await pipeline(starCmds);
  const starsByWeek: Record<number, number> = {};
  if (starRes && Array.isArray(starRes.result)){
    for (let i = 0; i < 8; i++){
      const v = starRes.result[i]?.result as unknown;
      const n = typeof v === 'number' ? v : Number(v || 0) || 0;
      starsByWeek[i+1] = n;
    }
  }

  const ledger = await readRecent(address, 50);

  return NextResponse.json({ address, totalXp, verified, starsByWeek, ledger });
}
