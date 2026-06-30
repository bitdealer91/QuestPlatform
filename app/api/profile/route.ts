import { NextResponse } from "next/server";
import { readRecent } from "@/lib/ledger";
import { pipeline } from "@/lib/redis";
import { getSocialAccounts } from "@/lib/socialAccounts";

export async function GET(req: Request) {
	const url = new URL(req.url);
	const address = (url.searchParams.get("address") || "").toLowerCase();
	if (!address) return NextResponse.json({ error: "address required" }, { status: 400 });

	const data = await pipeline([["SMEMBERS", `user:verified:${address}`]]);

	let verified: string[] = [];

	try {
		const raw = (data as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		if (Array.isArray(raw)) {
			const verRes = raw[0]?.result as unknown;
			verified = Array.isArray(verRes) ? (verRes as unknown[]).map(String) : [];
		} else if (raw && Array.isArray(raw.result)) {
			const bucket = raw.result[0]?.result as unknown;
			if (Array.isArray(bucket)) {
				const verRes = bucket[0];
				verified = Array.isArray(verRes) ? (verRes as unknown[]).map(String) : [];
			}
		}
	} catch { /* noop */ }

	const ledger = await readRecent(address, 50);
	const socialAccounts = await getSocialAccounts(address);

	return NextResponse.json({ address, verified, ledger, socialAccounts });
}
