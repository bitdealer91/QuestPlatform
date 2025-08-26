'use client';
import { useState, useCallback, useEffect } from 'react';
import { PlanetsRail } from '@/components/Galaxy/PlanetsRail';
import TaskDrawer from '@/components/Galaxy/TaskDrawer';
import { useAccount } from 'wagmi';
import { getUserStats } from '@/lib/progress';

export default function GalaxyMap(){
	const [openWeek, setOpenWeek] = useState<number | null>(null);
	const { address } = useAccount();
	const [userProgress, setUserProgress] = useState<ReturnType<typeof getUserStats> | null>(null);
	
	// Загружаем прогресс пользователя
	useEffect(() => {
		if (address) {
			const stats = getUserStats(address);
			setUserProgress(stats);
		}
	}, [address]);
	
		// Слушаем события обновления прогресса
	useEffect(() => {
		const handleProgressUpdate = (event: CustomEvent) => {
			console.log('🔄 Galaxy progress update event received:', event.detail);
			if (event.detail.address === address && address) {
				// Обновляем прогресс
				const stats = getUserStats(address);
				setUserProgress(stats);
			}
		};
		
		window.addEventListener('galaxy:progress-updated', handleProgressUpdate as EventListener);
		
		return () => {
			window.removeEventListener('galaxy:progress-updated', handleProgressUpdate as EventListener);
		};
	}, [address]);
	
	// Функция для подсчета звезд недели
	const getStarsForWeek = useCallback((weekId: number) => {
		console.log('🌟 getStarsForWeek called for week:', weekId);
		console.log('🌟 userProgress:', userProgress);
		
		if (!userProgress) {
			console.log('🌟 No user progress, returning 0 stars');
			return 0;
		}
		
		// Получаем таски для конкретной недели
		let weekTasks: Array<{ id: string; reward: { xp: number; star: boolean } }> = [];
		
		if (weekId === 1) {
			// Week 1: MetaEggs таск
			weekTasks = [
				{ id: 'mint', reward: { xp: 50, star: true } }
			];
		} else {
			// Другие недели пока не имеют тасков
			weekTasks = [];
		}
		
		console.log('🌟 Week', weekId, 'tasks:', weekTasks);
		console.log('🌟 Verified tasks:', userProgress.verifiedTasks);
		
		// Считаем завершенные таски со звездами только для этой недели
		const completedStarTasks = weekTasks.filter(task => 
			userProgress.verifiedTasks && userProgress.verifiedTasks.has(task.id) && task.reward.star
		);
		
		console.log('🌟 Week', weekId, 'completed star tasks:', completedStarTasks);
		
		// Возвращаем количество звезд (0-3) только для этой недели
		const stars = Math.min(completedStarTasks.length, 3) as 0|1|2|3;
		console.log('🌟 Week', weekId, 'returning stars:', stars);
		return stars;
	}, [userProgress]);
	
	const openTasks = useCallback((id: number) => setOpenWeek(id), []);
	
	return (
		<div className="relative w-full h-full">
			<PlanetsRail getStarsForWeek={getStarsForWeek} openTasks={openTasks} />
			<TaskDrawer weekId={openWeek} onClose={() => setOpenWeek(null)} />
		</div>
	);
}
