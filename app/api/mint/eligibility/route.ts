import { NextResponse } from 'next/server';
import { loadTasks } from '@/lib/store';
import { pipeline } from '@/lib/redis';
import { ELIGIBILITY_UNLOCK_CAP_PER_WEEK } from '@/lib/eligibilityPercent';
import { isTaskMandatory } from '@/lib/taskSpec';
import { isValidProgramWeek, resolveProgramWeeks } from '@/lib/weeks';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean { return /^0x[0-9a-f]{40}$/.test(a); }

export async function GET(req: Request){
  try {
    const url = new URL(req.url);
    const addressRaw = String(url.searchParams.get('address') || '').trim();
    const address = addressRaw.toLowerCase();
    const week = Number(url.searchParams.get('week') || '0');
    const debug = /^(1|true)$/i.test(String(url.searchParams.get('debug') || ''));
    if (!isLowercaseHexAddress(address) || !isValidProgramWeek(week)) {
      return NextResponse.json({ eligible: false, minted: false, reason: 'Invalid params' }, { status: 400 });
    }

    // Prefer production airdrop API if configured
    const useProd = /^(1|true)$/i.test(String(process.env.MINT_USE_PROD_AIRDROP || '1'));
    const prodUrlTmpl = String(process.env.AIRDROP_PERCENT_URL || '').trim();
    if (useProd && prodUrlTmpl) {
      try {
        const finalUrl = prodUrlTmpl.includes(':address')
          ? prodUrlTmpl.replace(':address', addressRaw || address)
          : (prodUrlTmpl.includes('?') ? `${prodUrlTmpl}&address=${addressRaw || address}` : `${prodUrlTmpl}?address=${addressRaw || address}`);
        const controller = new AbortController();
        const t = setTimeout(() => controller.abort(), 12000);
        const res = await fetch(finalUrl, { headers: { 'Accept': 'application/json' }, signal: controller.signal });
        clearTimeout(t);
        const j = await res.json().catch(() => ({}));
        // Expect shape similar to our internal percent API: { weeks: [{ unlockedPercentage: number }], currentWeek?: number }
        const weeks = Array.isArray(j?.weeks) ? j.weeks : [];
        const slot = weeks[week - 1] || { unlockedPercentage: 0 };
        const pct = Number(slot?.unlockedPercentage || 0);
        const eligible = pct >= ELIGIBILITY_UNLOCK_CAP_PER_WEEK; // full week unlock == all mandatory done
        const payload: Record<string, unknown> = { eligible, minted: false, reason: eligible ? undefined : 'Finish mandatory tasks' };
        if (debug) payload.debug = { source: 'prod', pct, weeksLen: weeks.length };
        return NextResponse.json(payload);
      } catch {
        // fall through to local computation
      }
    }

    const spec = await loadTasks();
    const totalWeeks = resolveProgramWeeks(spec.weeks);
    const tasks = (spec.tasks || []).filter(t => (t as any).week === week);
    const mandatoryIds = tasks.filter(t => isTaskMandatory(t as { mandatory?: boolean; [key: string]: unknown })).map(t => String((t as any).id));

    // Current week index based on programStart
    const startIso = spec.programStart;
    const start = startIso ? new Date(startIso) : null;
    const now = new Date();
    const weekMs = 7 * 24 * 60 * 60 * 1000;
    let currentWeekIdx = 0;
    if (start && !isNaN(start.getTime())){
      const elapsed = Math.max(0, now.getTime() - start.getTime());
      currentWeekIdx = Math.min(totalWeeks - 1, Math.floor(elapsed / weekMs));
    }
    const weekEnded = start ? (now.getTime() >= start.getTime() + (week * weekMs)) : true;
    const allowCurrentWeek = /^(1|true)$/i.test(String(process.env.MINT_DEV_ALLOW_CURRENT || '1'));

    // Verified tasks from Redis
    const redisRes = await pipeline([["SMEMBERS", `user:verified:${address}`]]);
    let verified: string[] = [];
    try {
      const raw = (redisRes as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
      if (Array.isArray(raw)) {
        const bucket = raw[0]?.result as unknown;
        if (Array.isArray(bucket)) verified = (bucket as unknown[]).map(String);
        else if (typeof bucket === 'string') verified = bucket.split(',').map(s => s.trim()).filter(Boolean);
      } else if (raw && Array.isArray(raw.result)) {
        const bucket = raw.result[0]?.result as unknown;
        if (Array.isArray(bucket)) verified = (bucket as unknown[]).map(String);
        else if (typeof bucket === 'string') verified = bucket.split(',').map(s => s.trim()).filter(Boolean);
      }
    } catch { verified = []; }
    const set = new Set(verified);

    const completed = mandatoryIds.length > 0 && mandatoryIds.every(id => set.has(id));
    const eligible = completed && ((weekEnded && week - 1 <= currentWeekIdx) || (allowCurrentWeek && week - 1 <= currentWeekIdx));

    const reason = eligible ? undefined : (!completed ? 'Finish mandatory tasks' : (!weekEnded ? 'Available after week end' : 'Not available yet'));
    const payload: Record<string, unknown> = { eligible, minted: false, reason };
    if (debug) {
      payload.debug = {
        source: 'local',
        week,
        mandatoryIds,
        verifiedIds: Array.from(set),
        completed,
        currentWeekIdx,
        weekEnded,
      };
    }
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ eligible: false, minted: false, reason: 'Internal error' }, { status: 500 });
  }
}



