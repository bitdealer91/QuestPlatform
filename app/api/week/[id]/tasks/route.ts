import { NextResponse } from "next/server";
import { getWeekTasks } from "@/lib/store";

export async function GET(_: Request, { params }: { params: { id: string } }) {
	const idNum = Number(params.id);
	if (!Number.isInteger(idNum) || idNum < 1) {
		return NextResponse.json({ error: "Invalid week id" }, { status: 400 });
	}
	
	try {
		const items = await getWeekTasks(idNum);
		const transformed = items.map((t: any) => ({
			id: t.id,
			type: t.type,
			title: t.title,
			desc: t.description,
			href: t.href,
			reward: { xp: t.xp ?? 0, star: t.star ?? false },
			status: "todo" as const,
			// Добавляем данные о брендинге
			brand: t.brand,
			logo: t.logo,
			brand_color: t.brand_color,
			logo_variant: t.logo_variant,
			// Добавляем категорию
			category: t.category,
		}));
		
		return NextResponse.json(transformed, { 
			headers: { 
				"Cache-Control": "public, max-age=300, stale-while-revalidate=600",
				"X-Cache-Status": "HIT"
			} 
		});
	} catch (error) {
		console.error('Error loading week tasks:', error);
		return NextResponse.json({ error: "Failed to load tasks" }, { status: 500 });
	}
}
