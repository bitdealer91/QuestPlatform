const fs = require('fs');
const path = require('path');
const { once } = require('events');
const Redis = require('ioredis');

(async () => {
  const url = process.env.REDIS_URL || '';
  if (!url) { console.error('REDIS_URL not set'); process.exit(2); }
  const red = url.startsWith('redis://') ? url.replace('redis://', 'rediss://') : url;
  const client = new Redis(red, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  try { await client.connect(); } catch (e) { console.error('Failed to connect:', e?.message || e); process.exit(1); }

  const byAddr = new Map(); // addr -> { total: number, weeks: number[8] }

  let cursor = '0';
  const SCAN_COUNT = 1000;
  let pages = 0;
  const t0 = Date.now();

  try {
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', 'user:stars:*', 'COUNT', String(SCAN_COUNT));
      cursor = String(next || '0');
      const kArr = Array.isArray(keys) ? keys : [];
      if (kArr.length > 0){
        const CHUNK = 1000;
        for (let i = 0; i < kArr.length; i += CHUNK){
          const slice = kArr.slice(i, i + CHUNK);
          let vals = [];
          try {
            const pipe = client.pipeline();
            for (const k of slice) pipe.scard(k);
            const res = await pipe.exec();
            vals = res.map(x => (x && x[1]) ?? 0);
          } catch {
            vals = new Array(slice.length).fill(0);
          }

          for (let j = 0; j < slice.length; j++){
            const key = slice[j] || '';
            const parts = key.split(':');
            const addr = (parts[2] || '').toLowerCase();
            const weekNum = Number(parts[3] || 0);
            if (!addr || !(weekNum >= 1 && weekNum <= 8)) continue;
            const nRaw = vals[j];
            const n = (typeof nRaw === 'number') ? nRaw : (Number(nRaw || 0) || 0);
            const rec = byAddr.get(addr) || { total: 0, weeks: Array(8).fill(0) };
            rec.total += n;
            rec.weeks[weekNum - 1] = n;
            byAddr.set(addr, rec);
          }
        }
      }
      pages++;
      if (pages % 10 === 0){
        const sec = Math.round((Date.now() - t0) / 1000);
        console.log('stars pages=' + pages + ' wallets=' + byAddr.size + ' t=' + sec + 's');
      }
    } while (cursor !== '0');
  } finally {
    await client.quit().catch(() => {});
  }

  const outPath = path.resolve('report_wallet_stars.csv');
  const out = fs.createWriteStream(outPath, { flags: 'w' });
  const toCsv = (arr) => arr.map(s => {
    if (s == null) return '';
    const v = String(s);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',') + '\n';
  out.write(toCsv(['wallet', 'total_stars', 'stars_w1', 'stars_w2', 'stars_w3', 'stars_w4', 'stars_w5', 'stars_w6', 'stars_w7', 'stars_w8']));
  for (const [addr, rec] of byAddr.entries()){
    out.write(toCsv([addr, rec.total, ...rec.weeks]));
  }
  out.end();
  await once(out, 'finish');
  console.log('stars DONE wallets=' + byAddr.size + ' file=' + outPath);
})().catch(e => { console.error(e); process.exit(1); });


