import { NextResponse } from "next/server";
import { z } from "zod";

const Body = z.object({ address: z.string(), taskId: z.string(), txHash: z.string().optional() });

export async function POST(req: Request) {
	const body = await req.json().catch(() => ({}));
	const parsed = Body.safeParse(body);
	if (!parsed.success) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
	const statuses = ["pending", "verified", "rejected"] as const;
	const pick = statuses[Math.floor(Math.random() * statuses.length)];
	return NextResponse.json({ status: pick, xpDelta: pick === "verified" ? 20 : 0, starEarned: pick === "verified" && Math.random() > 0.6 });
}
