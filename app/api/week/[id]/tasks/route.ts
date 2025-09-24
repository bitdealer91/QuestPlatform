import { NextResponse } from "next/server";
import { getProgramStart, getWeekTasks } from "@/lib/store";

export async function GET(req: Request, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id);
  if (isNaN(idNum) || idNum < 1 || idNum > 8) {
    return NextResponse.json({ error: "Invalid week ID" }, { status: 400 });
  }

  try {
    const url = new URL(req.url);
    const starsMode = /^(1|true)$/i.test(String(url.searchParams.get('stars') || ''));
    const items = await getWeekTasks(idNum);
    let useItems = items;
    // Hide tasks explicitly marked as hidden
    useItems = useItems.filter((t) => (t as any).hidden !== true);
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
        const now = new Date();
        // Считаем дни с опорой на локальную дату (UTC-нейтрально): округляем до полночей
        const dayMs = 24 * 60 * 60 * 1000;
        const noonOffsetMs = 12 * 60 * 60 * 1000; // 12:00 UTC граница
        // Сдвигаем границу на полдень UTC: в 12:00 UTC открывается следующий "day"
        const elapsed = Math.max(0, Math.floor((now.getTime() - start.getTime() + noonOffsetMs) / dayMs)) + 1; // Day 1 в день старта
        // Фильтруем по полю day
        const gated = items.filter((t) => (typeof (t as any).day === 'number' ? (t as any).day <= elapsed : true));
        useItems = gated;
      }
    } catch {}
    // For weeks 1-3, hide all non-mandatory tasks by default.
    // If stars=1 is requested, return only star tasks (to allow star rendering even when tasks are hidden).
    if (idNum >= 1 && idNum <= 3) {
      if (starsMode) {
        useItems = useItems.filter((t) => (t as any).star === true);
      } else {
        useItems = useItems.filter((t) => (t as any).mandatory === true || (t as any)["mandatory task"] === true);
      }
    }

    const transformed = useItems.map((t) => ({
      id: t.id,
      type: t.type,
      title: t.title,
      desc: t.description,
      href: t.href,
      reward: { xp: t.xp, star: t.star },
      status: "todo" as const,
      mandatory: (t as any).mandatory === true || (t as any)["mandatory task"] === true,
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
