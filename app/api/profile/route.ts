import { NextResponse } from "next/server";
import { z } from "zod";

const Profile = z.object({ address: z.string(), totalXp: z.number(), totalStars: z.number(), claimable: z.number(), weeksCompleted: z.number() });

export async function GET(req: Request) {
	const url = new URL(req.url);
	const address = url.searchParams.get("address") || "0x0";
	const data = { address, totalXp: 0, totalStars: 0, claimable: 0, weeksCompleted: 0 };
	return NextResponse.json(Profile.parse(data));
}
