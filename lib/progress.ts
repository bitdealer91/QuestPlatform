import { Task } from './tasks';

export interface UserProgress {
	completedQuests: number;
	verifiedTasks: Set<string>;
}

export function saveUserProgress(address: string, progress: UserProgress): void {
	if (!address) return;

	const key = `somnia:progress:${address.toLowerCase()}`;
	const data = {
		...progress,
		verifiedTasks: Array.from(progress.verifiedTasks),
		lastUpdated: Date.now(),
	};

	localStorage.setItem(key, JSON.stringify(data));
}

export function loadUserProgress(address: string): UserProgress | null {
	if (!address) return null;

	const key = `somnia:progress:${address.toLowerCase()}`;
	const data = localStorage.getItem(key);

	if (!data) return null;

	try {
		const parsed = JSON.parse(data);
		return {
			completedQuests: Number(parsed.completedQuests || 0),
			verifiedTasks: new Set(parsed.verifiedTasks || []),
		};
	} catch {
		return null;
	}
}

export function addVerifiedTask(address: string, taskId: string): UserProgress {
	const currentProgress = loadUserProgress(address) || {
		completedQuests: 0,
		verifiedTasks: new Set<string>(),
	};

	if (!currentProgress.verifiedTasks.has(taskId)) {
		currentProgress.verifiedTasks.add(taskId);
		currentProgress.completedQuests += 1;
	}

	saveUserProgress(address, currentProgress);
	return currentProgress;
}

export function resetUserProgress(address: string): void {
	if (!address) return;

	const key = `somnia:progress:${address.toLowerCase()}`;
	localStorage.removeItem(key);

	const verifiedKey = `somnia:verified:${address.toLowerCase()}`;
	localStorage.removeItem(verifiedKey);
}
