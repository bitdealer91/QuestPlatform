import { pipeline, type PipelineCmd } from './redis';

const MAX_EVENTS_PER_USER = 500;

export type LedgerEvent = {
  ts: number;
  type: 'attempt'|'success'|'failure';
  taskId: string;
  detail?: string;
};

function keyEvents(addr: string){ return `ledger:${addr.toLowerCase()}:events`; }
function keyCounts(addr: string){ return `ledger:${addr.toLowerCase()}:counts`; }

export async function writeAttempt(address: string, taskId: string){
  return writeEvent(address, { ts: Date.now(), type: 'attempt', taskId });
}

export async function writeSuccess(address: string, taskId: string){
  const cmds: PipelineCmd[] = [
    ['HINCRBY', keyCounts(address), 'success', 1],
    ['HINCRBY', keyCounts(address), `task:${taskId}:success`, 1],
  ];
  await pipeline(cmds);
  return writeEvent(address, { ts: Date.now(), type: 'success', taskId });
}

export async function writeFailure(address: string, taskId: string, detail?: string){
  const cmds: PipelineCmd[] = [
    ['HINCRBY', keyCounts(address), 'failure', 1],
    ['HINCRBY', keyCounts(address), `task:${taskId}:failure`, 1],
  ];
  await pipeline(cmds);
  return writeEvent(address, { ts: Date.now(), type: 'failure', taskId, detail });
}

async function writeEvent(address: string, ev: LedgerEvent){
  const evStr = JSON.stringify(ev);
  const cmds: PipelineCmd[] = [
    ['LPUSH', keyEvents(address), evStr],
    ['LTRIM', keyEvents(address), 0, MAX_EVENTS_PER_USER - 1],
  ];
  await pipeline(cmds);
}

export async function readRecent(address: string, limit = 100): Promise<LedgerEvent[]>{
  const res = await pipeline([['LRANGE', keyEvents(address), 0, Math.max(0, limit - 1)]]);
  const arr = (res?.result?.[0]?.result as unknown) as string[] | undefined;
  if (!Array.isArray(arr)) return [];
  const parsed = arr.map((s) => { try { return JSON.parse(s) as LedgerEvent; } catch { return null; } }).filter((v): v is LedgerEvent => Boolean(v));
  return parsed;
}

