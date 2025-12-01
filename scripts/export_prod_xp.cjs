const fs = require('fs');
const path = require('path');

function postprocessCsv(inputPath, cleanCsvPath, prettyTxtPath){
  const text = fs.readFileSync(inputPath, 'utf8');
  const lines = text.split(/\r?\n/).filter(Boolean);
  const body = lines[0] && /^wallet\s*,\s*total_xp/i.test(lines[0]) ? lines.slice(1) : lines;
  const addrToXp = new Map();
  for (const line of body){
    const idx = line.indexOf(',');
    if (idx < 0) continue;
    const addr = line.slice(0, idx).trim().toLowerCase();
    const xp = Number(line.slice(idx + 1).trim()) || 0;
    const prev = addrToXp.get(addr);
    if (prev == null || xp > prev) addrToXp.set(addr, xp);
  }
  const rows = Array.from(addrToXp.entries()).sort((a, b) => (b[1] - a[1]) || a[0].localeCompare(b[0]));
  const width = rows.reduce((m, [a]) => Math.max(m, a.length), 0);
  // Write clean CSV
  const csv = ['wallet,total_xp'].concat(rows.map(([a, x]) => a + ',' + x)).join('\n') + '\n';
  fs.writeFileSync(cleanCsvPath, csv);
  // Write pretty text
  const pretty = rows.map(([a, x]) => a.padEnd(width, ' ') + '  ' + x).join('\n') + '\n';
  fs.writeFileSync(prettyTxtPath, pretty);
}

async function main(){
  const BASE = process.env.BASE_URL || '';
  const TOKEN = process.env.ADMIN_TOKEN || '';
  if (!BASE || !TOKEN){
    console.error('Please set BASE_URL and ADMIN_TOKEN');
    process.exit(2);
  }

  const BATCH = Math.max(1, Math.min(1000, Number(process.env.XP_BATCH || 200)));
  const SLEEP_MS = Math.max(0, Number(process.env.XP_SLEEP_MS || 300));
  const MAX_RETRY = Math.max(1, Number(process.env.XP_MAX_RETRY || 50));
  const RETRY_BASE_MS = Math.max(100, Number(process.env.XP_RETRY_DELAY_MS || 1000));
  const REQ_TIMEOUT_MS = Math.max(5000, Number(process.env.XP_REQ_TIMEOUT_MS || (SLEEP_MS + 20000)));
  const MIN_BATCH = Math.max(50, Math.min(BATCH, Number(process.env.XP_MIN_BATCH || 200)));
  const MAX_BATCH = Math.max(BATCH, Number(process.env.XP_MAX_BATCH || 1000));
  const ADAPTIVE = String(process.env.XP_ADAPTIVE || '1') === '1';
  const ADAPT_FAILS_DOWN = Math.max(2, Number(process.env.XP_ADAPT_FAILS_DOWN || 3)); // consecutive fails to step down
  const ADAPT_SUCC_UP = Math.max(3, Number(process.env.XP_ADAPT_SUCC_UP || 8)); // consecutive successes to step up
  const SLEEP_MIN = Math.max(0, Number(process.env.XP_SLEEP_MIN || 50));
  const SLEEP_MAX = Math.max(SLEEP_MS, Number(process.env.XP_SLEEP_MAX || 500));

  const outPath = path.resolve('report_wallet_xp.csv');
  const needHeader = !fs.existsSync(outPath) || fs.statSync(outPath).size === 0;
  // Optional: skip already-seen wallets to prevent duplicates when resuming
  const SKIP_SEEN = String(process.env.SKIP_SEEN || '1') === '1';
  const seen = new Set();
  if (SKIP_SEEN && !needHeader && fs.existsSync(outPath)) {
    try {
      const text = fs.readFileSync(outPath, 'utf8');
      const lines = text.split('\n');
      // skip header at index 0
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        const addr = (line.split(',')[0] || '').replace(/[\r"]/g, '').trim().toLowerCase();
        if (addr) seen.add(addr);
      }
      console.log(`loaded seen wallets: ${seen.size}`);
    } catch {}
  }
  const out = fs.createWriteStream(outPath, { flags: needHeader ? 'w' : 'a' });
  const wr = (arr) => out.write(arr.join(',') + '\n');
  if (needHeader) wr(['wallet','total_xp']);

  // Resume support via sidecar cursor file
  const cursorPath = outPath + '.cursor';
  let cursor = '0';
  if (!needHeader && fs.existsSync(cursorPath) && String(process.env.FORCE_XP || '0') !== '1'){
    try {
      const saved = fs.readFileSync(cursorPath, 'utf8').trim();
      if (saved) cursor = saved;
      if (cursor !== '0') console.log(`Resuming from cursor=${cursor}`);
    } catch {}
  }
  let total = 0;
  let currentBatch = BATCH;
  let currentSleep = SLEEP_MS;
  let consecutiveFails = 0;
  let consecutiveSuccess = 0;
  let completedAll = false;

  const jitter = (ms) => {
    const d = Math.floor(ms * 0.15);
    return Math.max(0, ms + Math.floor((Math.random() * 2 - 1) * d));
  };

  try {
    do {
      // fetch with timeout + retries
      let attempt = 0;
      let j = null;
      const infiniteRetries = (Number.isFinite(MAX_RETRY) ? MAX_RETRY : 0) === 0; // XP_MAX_RETRY=0 => infinite
      while (infiniteRetries || attempt < MAX_RETRY){
        attempt++;
        try {
          const ctrl = new AbortController();
          const timer = setTimeout(() => ctrl.abort(), REQ_TIMEOUT_MS);
          const res = await fetch(`${BASE}/api/admin/xp/page`, {
            method: 'POST',
            headers: {
              'content-type': 'application/json',
              'accept': 'application/json',
              'user-agent': 'xp-exporter/1.0',
            },
            body: JSON.stringify({ token: TOKEN, batch: currentBatch, cursor }),
            signal: ctrl.signal
          });
          clearTimeout(timer);
          if (!res.ok){
            const t = await res.text().catch(() => '');
            throw new Error(`HTTP ${res.status} ${t}`);
          }
          j = await res.json();
          break; // success
        } catch (e) {
          const delay = Math.min(120_000, RETRY_BASE_MS * Math.pow(1.25, attempt - 1));
          console.warn(`xp fetch failed (attempt ${attempt}/${MAX_RETRY}): ${e?.message || e}. Retrying in ${Math.round(delay)}ms`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
      if (!j){
        throw new Error('Failed to fetch page after retries; resume supported. Re-run to continue from saved cursor.');
      }

      const items = Array.isArray(j.items) ? j.items : [];
      for (const it of items){
        const addr = String(it.address || '').toLowerCase();
        if (!addr) continue;
        if (SKIP_SEEN && seen.has(addr)) continue;
        wr([addr, String(it.xp || 0)]);
        if (SKIP_SEEN) seen.add(addr);
        total++;
      }
      if (items.length > 0){
        console.log(`xp page: +${items.length} rows, total=${total} (batch=${currentBatch}, sleep=${currentSleep})`);
      }
      cursor = String(j.cursor || '0');
      try { fs.writeFileSync(cursorPath, cursor, 'utf8'); } catch {}
      // Adaptive tuning
      if (ADAPTIVE){
        if (items.length === 0){
          // treat as soft failure
          consecutiveFails++;
          consecutiveSuccess = 0;
        } else {
          consecutiveSuccess++;
          consecutiveFails = 0;
        }
        if (consecutiveFails >= ADAPT_FAILS_DOWN){
          // step down: reduce batch and increase sleep
          const newBatch = Math.max(MIN_BATCH, Math.floor(currentBatch * 0.8));
          const newSleep = Math.min(SLEEP_MAX, Math.max(SLEEP_MIN, Math.floor((currentSleep || 0) * 1.5) || 100));
          if (newBatch !== currentBatch || newSleep !== currentSleep){
            console.warn(`adaptive: downshifting batch ${currentBatch}->${newBatch}, sleep ${currentSleep}->${newSleep}`);
            currentBatch = newBatch;
            currentSleep = newSleep;
          }
          consecutiveFails = 0;
        } else if (consecutiveSuccess >= ADAPT_SUCC_UP && currentBatch < MAX_BATCH){
          // step up: increase batch, slightly reduce sleep
          const newBatch = Math.min(MAX_BATCH, currentBatch + Math.max(25, Math.floor(currentBatch * 0.1)));
          const newSleep = Math.max(SLEEP_MIN, Math.floor((currentSleep || 0) * 0.8));
          if (newBatch !== currentBatch || newSleep !== currentSleep){
            console.log(`adaptive: upshifting batch ${currentBatch}->{${newBatch}}, sleep ${currentSleep}->${newSleep}`);
            currentBatch = newBatch;
            currentSleep = newSleep;
          }
          consecutiveSuccess = 0;
        }
      }
      if (cursor !== '0'){
        const sleepMs = jitter(currentSleep);
        if (sleepMs > 0) await new Promise(r => setTimeout(r, sleepMs));
      }
    } while (cursor !== '0');
    completedAll = true;
  } finally {
    out.end();
    try {
      if (completedAll) {
        if (fs.existsSync(cursorPath)) fs.unlinkSync(cursorPath);
        console.log('Export completed successfully. Cursor file removed.');
      } else {
        console.warn('Export did not finish. Cursor retained for resume on next run.');
      }
    } catch {}
  }
  console.log(`Wrote ${outPath}`);
  const DO_POST = String(process.env.XP_POSTPROCESS || '1') === '1';
  if (DO_POST && completedAll){
    try {
      const cleanCsvPath = path.resolve('report_wallet_xp.clean.csv');
      const prettyTxtPath = path.resolve('report_wallet_xp.pretty.txt');
      postprocessCsv(outPath, cleanCsvPath, prettyTxtPath);
      console.log(`Post-processed -> ${cleanCsvPath}, ${prettyTxtPath}`);
    } catch (e) {
      console.warn('Post-process failed:', e?.message || e);
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });



