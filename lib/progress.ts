import { Task } from './tasks';

export interface UserProgress {
  totalXP: number;
  level: number;
  completedQuests: number;
  verifiedTasks: Set<string>;
  weeklyProgress: Record<number, {
    completed: number;
    total: number;
    xp: number;
  }>;
}

export interface QuestReward {
  xp: number;
  star?: boolean;
  stt?: number;
}

// XP для каждого уровня
const XP_LEVELS = [
  0,    // Level 1
  100,  // Level 2
  250,  // Level 3
  450,  // Level 4
  700,  // Level 5
  1000, // Level 6
  1350, // Level 7
  1750, // Level 8
  2200, // Level 9
  2700, // Level 10
];

// Вычисляем уровень на основе XP
export function calculateLevel(xp: number): number {
  for (let i = XP_LEVELS.length - 1; i >= 0; i--) {
    const thr = XP_LEVELS[i] ?? 0;
    if (xp >= thr) {
      return i + 1;
    }
  }
  return 1;
}

// Вычисляем прогресс до следующего уровня
export function calculateLevelProgress(xp: number): { current: number; next: number; percentage: number } {
	const level = calculateLevel(xp);
	const currentLevelXP = XP_LEVELS[Math.min(level - 1, XP_LEVELS.length - 1)] ?? 0;
	const nextLevelXP = XP_LEVELS[Math.min(level, XP_LEVELS.length - 1)] ?? (currentLevelXP + 100);
  
  const progress = xp - currentLevelXP;
  const total = nextLevelXP - currentLevelXP;
  const percentage = total > 0 ? Math.round((progress / total) * 100) : 100;
  
  return {
    current: currentLevelXP,
    next: nextLevelXP,
    percentage: Math.max(0, Math.min(100, percentage))
  };
}

// Вычисляем общий прогресс пользователя
export function calculateUserProgress(
  verifiedTasks: Set<string>,
  allTasks: Task[]
): UserProgress {
  const verifiedTaskIds = Array.from(verifiedTasks);
  const completedTasks = allTasks.filter(task => verifiedTaskIds.includes(task.id));
  
  // Общий XP
  const totalXP = completedTasks.reduce((sum, task) => sum + task.reward.xp, 0);
  
  // Уровень
  const level = calculateLevel(totalXP);
  
  // Количество завершенных квестов
  const completedQuests = completedTasks.length;
  
  // Прогресс по неделям
  const weeklyProgress: Record<number, { completed: number; total: number; xp: number }> = {};
  
  allTasks.forEach(task => {
    // По умолчанию все таски относятся к неделе 1
    const week = 1;
    if (!weeklyProgress[week]) {
      weeklyProgress[week] = { completed: 0, total: 0, xp: 0 };
    }
    
    weeklyProgress[week].total++;
    
    if (verifiedTaskIds.includes(task.id)) {
      weeklyProgress[week].completed++;
      weeklyProgress[week].xp += task.reward.xp;
    }
  });
  
  return {
    totalXP,
    level,
    completedQuests,
    verifiedTasks,
    weeklyProgress
  };
}

// Сохраняем прогресс в localStorage
export function saveUserProgress(address: string, progress: UserProgress): void {
  if (!address) return;
  
  const key = `somnia:progress:${address.toLowerCase()}`;
  const data = {
    ...progress,
    verifiedTasks: Array.from(progress.verifiedTasks),
    lastUpdated: Date.now()
  };
  
  localStorage.setItem(key, JSON.stringify(data));
}

// Загружаем прогресс из localStorage
export function loadUserProgress(address: string): UserProgress | null {
  if (!address) return null;
  
  const key = `somnia:progress:${address.toLowerCase()}`;
  const data = localStorage.getItem(key);
  
  if (!data) return null;
  
  try {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      verifiedTasks: new Set(parsed.verifiedTasks || [])
    };
  } catch {
    return null;
  }
}

// Добавляем верифицированный таск
export function addVerifiedTask(
  address: string,
  taskId: string,
  task: Task
): UserProgress {
  const currentProgress = loadUserProgress(address) || {
    totalXP: 0,
    level: 1,
    completedQuests: 0,
    verifiedTasks: new Set<string>(),
    weeklyProgress: {}
  };
  
  // Добавляем таск в верифицированные
  currentProgress.verifiedTasks.add(taskId);
  
  // Пересчитываем прогресс
  const newProgress = calculateUserProgress(
    currentProgress.verifiedTasks,
    [task] // Передаем только текущий таск для пересчета
  );
  
  // Обновляем общий XP
  newProgress.totalXP = currentProgress.totalXP + task.reward.xp;
  newProgress.level = calculateLevel(newProgress.totalXP);
  newProgress.completedQuests = currentProgress.completedQuests + 1;
  
  // Сохраняем
  saveUserProgress(address, newProgress);
  
  return newProgress;
}

// Получаем статистику для профиля
export function getUserStats(address: string): {
	level: number;
	xp: number;
	nextLevelXP: number;
	levelProgress: number;
	completedQuests: number;
	totalXP: number;
	verifiedTasks?: Set<string>;
} | null {
	const progress = loadUserProgress(address);
	if (!progress) return null;
	
	const levelProgress = calculateLevelProgress(progress.totalXP);
	
	return {
		level: progress.level,
		xp: progress.totalXP,
		nextLevelXP: levelProgress.next,
		levelProgress: levelProgress.percentage,
		completedQuests: progress.completedQuests,
		totalXP: progress.totalXP,
		verifiedTasks: progress.verifiedTasks
	};
}

// Сбрасываем прогресс пользователя
export function resetUserProgress(address: string): void {
	if (!address) return;
	
	const key = `somnia:progress:${address.toLowerCase()}`;
	localStorage.removeItem(key);
	
	// Также сбрасываем верифицированные таски
	const verifiedKey = `somnia:verified:${address.toLowerCase()}`;
	localStorage.removeItem(verifiedKey);
	
	console.log(`Progress reset for ${address}`);
}
