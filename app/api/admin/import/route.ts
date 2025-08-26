import { NextResponse } from "next/server";
import { saveTasks } from "@/lib/store";

export async function POST(req: Request){
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  try {
    const saved = await saveTasks(body);
    return NextResponse.json({ ok: true, total: saved.tasks.length });
  } catch (e:any){
    return NextResponse.json({ error: "Validation failed", detail: e.message }, { status: 400 });
  }
}










