import { NextResponse } from "next/server";
import { loadTasks } from "@/lib/store";

export async function GET(){
	const spec = await loadTasks();
	return NextResponse.json({ programStart: spec.programStart, weeks: spec.weeks ?? 8 });
}
