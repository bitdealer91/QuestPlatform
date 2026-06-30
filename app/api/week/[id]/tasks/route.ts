import { NextResponse } from "next/server";
import { getProgramStart, getWeekTasks } from "@/lib/store";
import { isTaskMandatory } from "@/lib/taskSpec";
import { getProgramElapsedDay } from "@/lib/programDay";
import { isValidProgramWeek } from "@/lib/weeks";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id);
  if (isNaN(idNum) || !isValidProgramWeek(idNum)) {
    return NextResponse.json({ error: "Invalid week ID" }, { status: 400 });
  }

  try {
    const url = new URL(req.url);
    const items = await getWeekTasks(idNum);
    let useItems = items;
    // Hide tasks explicitly marked as hidden
    useItems = useItems.filter((t) => (t as any).hidden !== true);
    // In development, temporarily hide specific tasks by ID (requested)
    if (process.env.NODE_ENV !== 'production') {
      const devHide = new Set(["standard-momo", "standard-trades"]);
      useItems = useItems.filter((t) => !devHide.has((t as any).id));
    }
    // Force-hide by IDs via env var (comma-separated)
    try {
      const env = process.env.HIDE_TASK_IDS || '';
      if (env && typeof env === 'string') {
        const hideSet = new Set(env.split(',').map(s => s.trim()).filter(Boolean));
        if (hideSet.size > 0) {
          useItems = useItems.filter((t) => !hideSet.has((t as any).id));
        }
      }
    } catch {}
    // Гейтинг по дате старта: показываем только задачи с day <= elapsed
    // Разблокировка новых дней происходит ежедневно в 12:00 UTC
    try {
      const start = await getProgramStart();
      if (start) {
        const elapsed = getProgramElapsedDay(start);
        const gated = items.filter((t) => (typeof (t as any).day === 'number' ? (t as any).day <= elapsed : true));
        useItems = gated;
      }
    } catch {}

    const transformed = useItems.map((t) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      desc: t.description,
      href: t.href,
      status: "todo" as const,
      mandatory: isTaskMandatory(t as { mandatory?: boolean; [key: string]: unknown }),
      brand: t.brand,
      logo: t.logo,
      brand_color: t.brand_color,
      logo_variant: t.logo_variant,
      tags: t.tags,
      category: t.category,
      verify_method: t.verify_method,
      verify_params: t.verify_params,
    }));
    return NextResponse.json(transformed, { headers: { "Cache-Control": "public, max-age=30, stale-while-revalidate=60" } });
  } catch (error) {
    console.error('Error fetching week tasks:', error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
