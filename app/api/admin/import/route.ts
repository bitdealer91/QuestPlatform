import { NextResponse } from "next/server";
import { saveTasks } from "@/lib/store";

export async function POST(req: Request){
  try {
    const body = await req.json();
    const saved = await saveTasks(body);
    return NextResponse.json({ ok: true, total: saved.tasks.length });
  } catch (e: unknown){
    const errorMessage = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: "Validation failed", detail: errorMessage }, { status: 400 });
  }
}










