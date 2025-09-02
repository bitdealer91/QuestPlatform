'use client';
import { useState, useCallback, useEffect } from 'react';
import { PlanetsRail } from '@/components/Galaxy/PlanetsRail';
import TaskDrawer from '@/components/Galaxy/TaskDrawer';
import { useAccount } from 'wagmi';

export default function GalaxyMap(){
	const [openWeek, setOpenWeek] = useState<number | null>(null);
	const { address } = useAccount();
	const [verifiedIds, setVerifiedIds] = useState<Set<string> | null>(null);
	const [starTasksByWeek, setStarTasksByWeek] = useState<Record<number, string[]>>({});
	
	// Загружаем верификацию с сервера (Redis)
	useEffect(() => {
		if (!address) { setVerifiedIds(null); return; }
		const ctrl = new AbortController();
		fetch(`/api/profile?address=${address}`, { signal: ctrl.signal })
			.then(r => r.json())
			.then(j => setVerifiedIds(new Set<string>(Array.isArray(j?.verified) ? j.verified : [])))
			.catch(() => setVerifiedIds(null));
		return () => ctrl.abort();
	}, [address]);
	
	// Подгружаем список "звёздных" тасков по неделям (id задач со star=true)
	useEffect(() => {
		let cancelled = false;
		(async () => {
			try {
				const weeks = Array.from({ length: 8 }, (_, i) => i + 1);
				const resps = await Promise.all(weeks.map(w => fetch(`/api/week/${w}/tasks`).then(r => r.json()).catch(() => [])));
				const map: Record<number, string[]> = {};
				resps.forEach((list, idx) => {
					const w = idx + 1;
					map[w] = Array.isArray(list) ? list.filter((t: any) => t?.reward?.star === true).map((t: any) => String(t.id)) : [];
				});
				if (!cancelled) setStarTasksByWeek(map);
			} catch { /* noop */ }
		})();
		return () => { cancelled = true; };
	}, []);

	// Реагируем на локальные обновления из TaskDrawer (событие galaxy:progress-updated)
	useEffect(() => {
		const onProgress = (e: Event) => {
			const ev = e as CustomEvent<{ address?: string; verifiedIds?: string[] }>;
			if (Array.isArray(ev.detail?.verifiedIds)){
				setVerifiedIds(new Set(ev.detail.verifiedIds.map(String)));
			}
		};
		window.addEventListener('galaxy:progress-updated', onProgress as EventListener);
		return () => window.removeEventListener('galaxy:progress-updated', onProgress as EventListener);
	}, []);

	// Функция для подсчета звезд недели
	const getStarsForWeek = useCallback((weekId: number) => {
		if (!verifiedIds) return 0;
		const starList = starTasksByWeek[weekId] || [];
		const stars = starList.filter(id => verifiedIds.has(id)).length;
		return Math.min(stars, 3) as 0|1|2|3;
	}, [verifiedIds, starTasksByWeek]);
	
	const openTasks = useCallback((id: number) => setOpenWeek(id), []);
	
	return (
		<div className="relative w-full h-full">
			<PlanetsRail getStarsForWeek={getStarsForWeek} openTasks={openTasks} />
			<TaskDrawer weekId={openWeek} onClose={() => setOpenWeek(null)} />
		</div>
	);
}
