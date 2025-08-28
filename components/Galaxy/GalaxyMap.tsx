'use client';
import { useState, useCallback, useEffect } from 'react';
import { PlanetsRail } from '@/components/Galaxy/PlanetsRail';
import TaskDrawer from '@/components/Galaxy/TaskDrawer';
import { useAccount } from 'wagmi';

export default function GalaxyMap(){
	const [openWeek, setOpenWeek] = useState<number | null>(null);
	const { address } = useAccount();
	const [verifiedIds, setVerifiedIds] = useState<Set<string> | null>(null);
	
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
	
	// Функция для подсчета звезд недели
	const getStarsForWeek = useCallback((weekId: number) => {
		if (!verifiedIds) return 0;
		// Простая логика: какие taskId относятся к неделе
		let weekTasks: string[] = [];
		if (weekId === 1) weekTasks = ['mint'];
		// TODO: заполнить для следующих недель при добавлении тасков
		const stars = weekTasks.filter(id => verifiedIds.has(id)).length;
		return Math.min(stars, 3) as 0|1|2|3;
	}, [verifiedIds]);
	
	const openTasks = useCallback((id: number) => setOpenWeek(id), []);
	
	return (
		<div className="relative w-full h-full">
			<PlanetsRail getStarsForWeek={getStarsForWeek} openTasks={openTasks} />
			<TaskDrawer weekId={openWeek} onClose={() => setOpenWeek(null)} />
		</div>
	);
}
