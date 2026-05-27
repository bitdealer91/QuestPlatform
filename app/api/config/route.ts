import { NextResponse } from "next/server";
import { loadTasks } from "@/lib/store";
import { resolveProgramWeeks } from "@/lib/weeks";

export async function GET(){
	const spec = await loadTasks();
	return NextResponse.json({
		programStart: spec.programStart,
		weeks: resolveProgramWeeks(spec.weeks),
	});
}
