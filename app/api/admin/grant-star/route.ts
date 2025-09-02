import { NextResponse } from "next/server";
import { pipeline } from "@/lib/redis";
import { findTask } from "@/lib/store";

export async function POST(req: Request){
  try {
    const body = await req.json().catch(() => ({}));
    const addressRaw = String((body?.address ?? '').toString() || '').toLowerCase();
    const taskId = String((body?.taskId ?? '').toString() || '').trim();
    const token = String((body?.token ?? '').toString() || '');

    const required = process.env.ADMIN_TOKEN;
    if (required && token !== required){
      return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
    }

    if (!/^0x[0-9a-f]{40}$/.test(addressRaw) || !taskId){
      return NextResponse.json({ error: 'bad_request' }, { status: 400 });
    }

    const task = await findTask(taskId);
    if (!task){
      return NextResponse.json({ error: 'task_not_found' }, { status: 404 });
    }

    const xp = typeof (task as any).xp === 'number' ? (task as any).xp : 0;
    const week = typeof (task as any).week === 'number' ? (task as any).week : undefined;
    const star = (task as any).star === true;

    const cmds: (string | number)[][] = [
      ["SADD", `user:verified:${addressRaw}`, taskId],
      ["INCRBY", `user:xp:${addressRaw}`, String(xp)],
      ["SET", `user:last:${addressRaw}:${taskId}`, String(Date.now()), "EX", "2592000"],
    ];
    if (star && typeof week === 'number' && week > 0 && week <= 8){
      cmds.push(["SADD", `user:stars:${addressRaw}:${week}`, taskId]);
    }

    const res = await pipeline(cmds);
    return NextResponse.json({ ok: true, xpDelta: xp, starred: star && week ? { week, taskId } : null, result: res });
  } catch {
    return NextResponse.json({ error: 'failed' }, { status: 500 });
  }
}


