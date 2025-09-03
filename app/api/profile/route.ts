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

	// Normalize results from both REST ([{result:..},{result:..}]) and native ({result:[{result:[..,..]}]})
	try {
		const raw = (data as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		if (Array.isArray(raw)) {
			// REST shape: index 0 -> xp, index 1 -> verified
			const xpRes = raw[0]?.result as unknown;
			const verRes = raw[1]?.result as unknown;
			totalXp = typeof xpRes === 'number' ? xpRes : Number(xpRes || 0) || 0;
			verified = Array.isArray(verRes) ? (verRes as unknown[]).map(String) : [];
		} else if (raw && Array.isArray(raw.result)) {
			// Native normalized shape: single entry whose result is an array of command results
			const bucket = raw.result[0]?.result as unknown;
			if (Array.isArray(bucket)) {
				const xpRes = bucket[0];
				const verRes = bucket[1];
				totalXp = typeof xpRes === 'number' ? xpRes : Number(xpRes || 0) || 0;
				verified = Array.isArray(verRes) ? (verRes as unknown[]).map(String) : [];
			}
		}
	} catch { /* noop */ }

	// Stars by week (SCARD for user:stars:{address}:{week})
	const starCmds = Array.from({ length: 8 }, (_, i) => ["SCARD", `user:stars:${address}:${i + 1}`] as (string|number)[]);
	const starRes = await pipeline(starCmds);
	const starsByWeek: Record<number, number> = {};
	if (starRes) {
		const raw = (starRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		if (Array.isArray(raw)) {
			for (let i = 0; i < 8; i++) {
				const v = raw[i]?.result as unknown;
				const n = typeof v === 'number' ? v : Number(v || 0) || 0;
				starsByWeek[i+1] = n;
			}
		} else if (raw && Array.isArray(raw.result)) {
			const bucket = raw.result[0]?.result as unknown;
			if (Array.isArray(bucket)) {
				for (let i = 0; i < 8; i++) {
					const v = bucket[i] as unknown;
					const n = typeof v === 'number' ? v : Number(v || 0) || 0;
					starsByWeek[i+1] = n;
				}
			}
		}
	}

	const ledger = await readRecent(address, 50);

	return NextResponse.json({ address, totalXp, verified, starsByWeek, ledger });
}
