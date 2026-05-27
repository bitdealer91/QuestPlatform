import { NextResponse } from "next/server";
import { readRecent } from "@/lib/ledger";
import { pipeline } from "@/lib/redis";
import { getSocialAccounts } from "@/lib/socialAccounts";

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

	const ledger = await readRecent(address, 50);
	const socialAccounts = await getSocialAccounts(address);

	return NextResponse.json({ address, totalXp, verified, ledger, socialAccounts });
}
