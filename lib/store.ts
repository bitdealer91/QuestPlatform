import fs from "node:fs/promises";
import path from "node:path";
import { TaskSpecZ, Task } from "./taskSpec";

const FILE = path.join(process.cwd(), "data", "tasks.json");
let CACHE: { tasks: Task[]; programStart?: string; weeks?: number } | null = null;
let LAST_MODIFIED: number = 0;
let CACHE_TIMESTAMP: number = 0;

// Увеличиваем время кеширования для лучшей производительности
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

async function readFileStore(){
  try {
    const buf = await fs.readFile(FILE, "utf8");
    return JSON.parse(buf);
  } catch { 
    console.warn('⚠️ Failed to read tasks.json, using default');
    return { tasks: [], programStart: undefined, weeks: 8 }; 
  }
}

async function shouldRefreshCache(): Promise<boolean> {
  if (!CACHE) return true;
  // Fast path: trust in-memory cache for a short window to avoid frequent fs.stat on hot paths
  if (Date.now() - CACHE_TIMESTAMP < 30000) { // 30s
    return false;
  }
  
  try {
    const stats = await fs.stat(FILE);
    const fileModified = stats.mtime.getTime();
    
    // Проверяем, изменился ли файл или истек кеш
    if (fileModified > LAST_MODIFIED || Date.now() - CACHE_TIMESTAMP > CACHE_TTL) {
      return true;
    }
    
    return false;
  } catch {
    // Если не можем проверить файл, используем кеш еще 5 минут
    if (Date.now() - CACHE_TIMESTAMP > 5 * 60 * 1000) {
      return true;
    }
    return false;
  }
}

async function loadTasksWithCache(){
  if (await shouldRefreshCache()) {
    console.log('🔄 Refreshing tasks cache...');
    const startTime = Date.now();
    
    CACHE = await readFileStore();
    LAST_MODIFIED = Date.now();
    CACHE_TIMESTAMP = Date.now();
    
    const loadTime = Date.now() - startTime;
    console.log(`✅ Tasks cache refreshed in ${loadTime}ms (${CACHE!.tasks.length} tasks)`);
  }
  return CACHE!;
}

async function writeFileStore(data: unknown){
  try {
    await fs.mkdir(path.dirname(FILE), { recursive: true });
    await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
    // Инвалидируем кеш при записи
    CACHE = null;
    LAST_MODIFIED = 0;
    CACHE_TIMESTAMP = 0;
  } catch (error) {
    console.error('❌ Failed to write tasks file:', error);
    throw error;
  }
}

export async function loadTasks(){
  if (process.env.SOMNIA_KV_URL){
    // TODO: implement KV later if provided; for now fall back to file
  }
  return await loadTasksWithCache();
}

export async function saveTasks(spec: unknown){
  const parsed = TaskSpecZ.parse(spec);
  const data = { tasks: parsed.tasks, programStart: parsed.programStart, weeks: parsed.weeks ?? 8 };
  CACHE = data;
  LAST_MODIFIED = Date.now();
  CACHE_TIMESTAMP = Date.now();
  await writeFileStore(data);
  return data;
}

export async function getWeeksSummary(){
  const { tasks, weeks = 8 } = await loadTasks();
  const result = Array.from({ length: weeks }, (_, i) => ({ 
    id: i+1, 
    title: `Week ${i+1}`, 
    tasks: 0 
  }));
  
  // Оптимизированный подсчет тасков по неделям
  const weekCounts = new Map<number, number>();
  tasks.forEach(t => {
    if (t.week && t.week > 0 && t.week <= weeks) {
      weekCounts.set(t.week, (weekCounts.get(t.week) || 0) + 1);
    }
  });
  
  result.forEach(week => {
    week.tasks = weekCounts.get(week.id) || 0;
  });
  
  return result;
}

export async function getWeekTasks(id: number){
  const { tasks } = await loadTasks();
  // Оптимизированная фильтрация
  return tasks.filter(t => t.week === id);
}

export async function findTask(id: string){
  const { tasks } = await loadTasks();
  // Оптимизированный поиск
  return tasks.find(t => t.id === id);
}

// Предзагружаем кеш при старте
export async function preloadCache() {
  try {
    console.log('🚀 Preloading tasks cache...');
    const startTime = Date.now();
    
    await loadTasksWithCache();
    
    const preloadTime = Date.now() - startTime;
    console.log(`✅ Tasks cache preloaded in ${preloadTime}ms`);
  } catch (error) {
    console.error('❌ Failed to preload tasks cache:', error);
  }
}
