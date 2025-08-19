import fs from "node:fs/promises";
import path from "node:path";
import { TaskSpecZ, Task } from "./taskSpec";

const FILE = path.join(process.cwd(), "data", "tasks.json");
let CACHE: { tasks: Task[]; programStart?: string; weeks?: number } | null = null;

async function readFileStore(){
  try {
    const buf = await fs.readFile(FILE, "utf8");
    return JSON.parse(buf);
  } catch { return { tasks: [], programStart: undefined, weeks: 8 }; }
}
async function writeFileStore(data:any){
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(data, null, 2), "utf8");
}

export async function loadTasks(){
  if (process.env.SOMNIA_KV_URL){
    // TODO: implement KV later if provided; for now fall back to file
  }
  if (!CACHE) CACHE = await readFileStore();
  return CACHE;
}
export async function saveTasks(spec: any){
  const parsed = TaskSpecZ.parse(spec);
  const data = { tasks: parsed.tasks, programStart: parsed.programStart, weeks: parsed.weeks ?? 8 };
  CACHE = data;
  await writeFileStore(data);
  return data;
}
export async function getWeeksSummary(){
  const { tasks, weeks = 8 } = await loadTasks();
  const result = Array.from({ length: weeks }, (_, i) => ({ id: i+1, title: `Week ${i+1}`, tasks: 0 }));
  tasks.forEach(t => result[t.week-1].tasks++);
  return result;
}
export async function getWeekTasks(id: number){
  const { tasks } = await loadTasks();
  return tasks.filter(t => t.week === id);
}
export async function findTask(id: string){
  const { tasks } = await loadTasks();
  return tasks.find(t => t.id === id);
}
