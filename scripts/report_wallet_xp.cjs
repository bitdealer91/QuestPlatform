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

  const outPath = path.resolve('report_wallet_xp.csv');
  const out = fs.createWriteStream(outPath, { flags: 'w' });

  const toCsv = (arr) => arr.map(s => {
    if (s == null) return '';
    const v = String(s);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',') + '\n';

  out.write(toCsv(['wallet', 'total_xp']));

  let cursor = '0';
  const SCAN_COUNT = 1000; // scan a page of keys
  let rows = 0, pages = 0;
  const t0 = Date.now();

  try {
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', 'user:xp:*', 'COUNT', String(SCAN_COUNT));
      cursor = String(next || '0');
      const kArr = Array.isArray(keys) ? keys : [];
      if (kArr.length > 0) {
        // MGET in chunks to reduce round-trips
        const CHUNK = 1000;
        for (let i = 0; i < kArr.length; i += CHUNK) {
          const slice = kArr.slice(i, i + CHUNK);
          let vals = [];
          try { vals = await client.mget(slice); } catch { vals = new Array(slice.length).fill(null); }
          for (let j = 0; j < slice.length; j++){
            const key = slice[j] || '';
            const addr = (key.split(':')[2] || '').toLowerCase();
            const v = vals[j];
            const xp = (typeof v === 'number') ? v : (Number(v || 0) || 0);
            if (addr) { out.write(toCsv([addr, xp])); rows++; }
          }
        }
      }
      pages++;
      if (pages % 10 === 0) {
        const sec = Math.round((Date.now() - t0) / 1000);
        console.log('xp pages=' + pages + ' rows=' + rows + ' t=' + sec + 's');
      }
    } while (cursor !== '0');
  } finally {
    out.end();
    await once(out, 'finish');
    await client.quit().catch(() => {});
  }

  console.log('xp DONE rows=' + rows + ' file=' + outPath);
})().catch(e => { console.error(e); process.exit(1); });


