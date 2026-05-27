'use client';
import { useState, useCallback, useEffect } from 'react';
import { PlanetsRail } from '@/components/Galaxy/PlanetsRail';
import TaskDrawer from '@/components/Galaxy/TaskDrawer';
import { ELIGIBILITY_UNLOCK_CAP_PER_WEEK } from '@/lib/eligibilityPercent';
import { useAccount } from 'wagmi';

export default function GalaxyMap(){
	const [openWeek, setOpenWeek] = useState<number | null>(null);
	const { address } = useAccount();
	const [mandatoryDoneByWeek, setMandatoryDoneByWeek] = useState<Record<number, boolean>>({});

	// Загружаем состояние обязательных задач (нужно для гейтинга Mint/Claim)
	const refreshMandatory = useCallback(async (addr?: string) => {
		const target = (addr || address || '').toLowerCase();
		if (!target) { setMandatoryDoneByWeek({}); return; }
		try {
			const res = await fetch(`/api/eligibility/percent?address=${target}`, { cache: 'no-store' });
			const json = await res.json().catch(() => null) as { weeks?: Array<{ unlockedPercentage?: number }> } | null;
			if (!json || !Array.isArray(json.weeks)) return;
			const map: Record<number, boolean> = {};
			json.weeks.forEach((w, idx) => {
				const pct = Number(w?.unlockedPercentage || 0);
				if (Number.isFinite(pct)) {
					map[idx + 1] = pct >= ELIGIBILITY_UNLOCK_CAP_PER_WEEK;
				}
			});
			setMandatoryDoneByWeek(map);
		} catch {
			// keep previous state on error
		}
	}, [address]);

	useEffect(() => {
		if (!address) { setMandatoryDoneByWeek({}); return; }
		refreshMandatory(address);
	}, [address, refreshMandatory]);
	
	// Реагируем на локальные обновления из TaskDrawer (событие galaxy:progress-updated)
	useEffect(() => {
		const onProgress = () => {
			if (address) refreshMandatory(address);
		};
		window.addEventListener('galaxy:progress-updated', onProgress as EventListener);
		return () => window.removeEventListener('galaxy:progress-updated', onProgress as EventListener);
	}, [address, refreshMandatory]);

	const openTasks = useCallback((id: number) => setOpenWeek(id), []);
	
	return (
		<div className="relative w-full h-full">
			<PlanetsRail openTasks={openTasks} mandatoryDoneByWeek={mandatoryDoneByWeek} />
			<TaskDrawer weekId={openWeek} onClose={() => setOpenWeek(null)} />
		</div>
	);
}
