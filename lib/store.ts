import fs from "node:fs/promises";
import path from "node:path";
import { TaskSpecZ, Task } from "./taskSpec";

const FILE = path.join(process.cwd(), "data", "tasks.json");
let CACHE: { tasks: Task[]; programStart?: string; weeks?: number } | null = null;
let LAST_MODIFIED: number = 0;
let CACHE_TIMESTAMP: number = 0;

// Кешируем на 5 минут
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function readFileStore(){
  try {
    const buf = await fs.readFile(FILE, "utf8");
    return JSON.parse(buf);
  } catch { return { tasks: [], programStart: undefined, weeks: 8 }; }
}

async function shouldRefreshCache(): Promise<boolean> {
  if (!CACHE) return true;
  
  try {
    const stats = await fs.stat(FILE);
    const fileModified = stats.mtime.getTime();
    
    // Проверяем, изменился ли файл или истек кеш
    if (fileModified > LAST_MODIFIED || Date.now() - CACHE_TIMESTAMP > CACHE_TTL) {
      return true;
    }
    
    return false;
  } catch {
    return true;
  }
}

async function loadTasksWithCache(){
  if (await shouldRefreshCache()) {
    console.log('🔄 Refreshing tasks cache...');
    CACHE = await readFileStore();
    LAST_MODIFIED = Date.now();
    CACHE_TIMESTAMP = Date.now();
    console.log('✅ Tasks cache refreshed');
  }
  return CACHE!;
}

async function writeFileStore(data: unknown){
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
  // Инвалидируем кеш при записи
  CACHE = null;
  LAST_MODIFIED = 0;
  CACHE_TIMESTAMP = 0;
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
  const result = Array.from({ length: weeks }, (_, i) => ({ id: i+1, title: `Week ${i+1}`, tasks: 0 }));
  tasks.forEach(t => {
    if (t.week && t.week > 0 && t.week <= result.length) {
      result[t.week-1].tasks++;
    }
  });
  return result;
}

export async function getWeekTasks(id: number){
  const { tasks } = await loadTasks();
  return tasks.filter(t => t.week && t.week === id);
}

export async function findTask(id: string){
  const { tasks } = await loadTasks();
  return tasks.find(t => t.id && t.id === id);
}

// Предзагружаем кеш при старте
export async function preloadCache() {
  try {
    await loadTasksWithCache();
    console.log('🚀 Tasks cache preloaded');
  } catch (error) {
    console.error('❌ Failed to preload tasks cache:', error);
  }
}
