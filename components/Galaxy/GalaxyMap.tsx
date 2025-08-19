'use client';
import { useState, useCallback } from 'react';
import { PlanetsRail } from '@/components/Galaxy/PlanetsRail';
import TaskDrawer from '@/components/Galaxy/TaskDrawer';

export default function GalaxyMap(){
	const [openWeek, setOpenWeek] = useState<number | null>(null);
	const getStarsForWeek = useCallback((id: number) => { void id; return 0 as 0|1|2|3; }, []);
	const openTasks = useCallback((id: number) => setOpenWeek(id), []);
	return (
		<div className="relative">
			<PlanetsRail getStarsForWeek={getStarsForWeek} openTasks={openTasks} />
			<TaskDrawer weekId={openWeek} onClose={() => setOpenWeek(null)} />
		</div>
	);
}
