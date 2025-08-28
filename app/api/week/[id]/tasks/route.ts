import { NextResponse } from "next/server";
import { getWeekTasks } from "@/lib/store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const idNum = parseInt(params.id);
  if (isNaN(idNum) || idNum < 1 || idNum > 8) {
    return NextResponse.json({ error: "Invalid week ID" }, { status: 400 });
  }

  try {
    const items = await getWeekTasks(idNum);
    const transformed = items.map((t) => ({
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
    return NextResponse.json(transformed);
  } catch (error) {
    console.error('Error fetching week tasks:', error);
    return NextResponse.json({ error: "Failed to fetch tasks" }, { status: 500 });
  }
}
