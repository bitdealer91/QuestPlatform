import { NextResponse } from "next/server";
import { getWeeksSummary } from "@/lib/store";
export async function GET(){
    const weeks = await getWeeksSummary();
    // Preserve UI schema
    const transformed = weeks.map(w => ({
        id: w.id,
        title: w.title,
        percent: 0,
        status: w.id === 1 ? "available" : "locked",
    }));
    return NextResponse.json(transformed, { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=120" } });
}
