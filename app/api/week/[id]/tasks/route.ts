import { NextResponse } from "next/server";
import { getProgramStart, getWeekTasks } from "@/lib/store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id);
  if (isNaN(idNum) || idNum < 1 || idNum > 8) {
    return NextResponse.json({ error: "Invalid week ID" }, { status: 400 });
  }

  try {
    const items = await getWeekTasks(idNum);
    let useItems = items;
    // Гейтинг по дате старта: показываем только задачи с day <= (сегодня - programStart)
    try {
      const start = await getProgramStart();
      if (start) {
        const now = new Date();
        // Считаем дни с опорой на локальную дату (UTC-нейтрально): округляем до полночей
        const dayMs = 24 * 60 * 60 * 1000;
        const startDay = Math.floor(start.getTime() / dayMs);
        const nowDay = Math.floor(now.getTime() / dayMs);
        const elapsed = Math.max(0, nowDay - startDay) + 1; // Day 1 в день старта
        // Фильтруем по полю day
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
      reward: { xp: t.xp, star: t.star },
      status: "todo" as const,
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
