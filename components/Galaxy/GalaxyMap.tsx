'use client';
import { useState, useCallback } from 'react';
import { PlanetsRail } from '@/components/Galaxy/PlanetsRail';
import TaskDrawer from '@/components/Galaxy/TaskDrawer';
import { useWeekDropUnlock } from '@/lib/useWeekDropUnlock';
import { useWeekIslandUnlock } from '@/lib/useWeekIslandUnlock';

export default function GalaxyMap(){
	const [openWeek, setOpenWeek] = useState<number | null>(null);
	const dropUnlockedByWeek = useWeekDropUnlock();
	const islandUnlockedByWeek = useWeekIslandUnlock();

	const openTasks = useCallback((id: number) => setOpenWeek(id), []);
	
	return (
		<div className="relative w-full h-full">
			<PlanetsRail
				openTasks={openTasks}
				dropUnlockedByWeek={dropUnlockedByWeek}
				islandUnlockedByWeek={islandUnlockedByWeek}
			/>
			<TaskDrawer weekId={openWeek} onClose={() => setOpenWeek(null)} />
		</div>
	);
}
