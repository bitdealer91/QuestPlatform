const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

(async () => {
  const url = process.env.REDIS_URL || '';
  if (!url) { console.error('REDIS_URL not set'); process.exit(2); }
  const red = url.startsWith('redis://') ? url.replace('redis://', 'rediss://') : url;
  const client = new Redis(red, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  await client.connect();

  const out = fs.createWriteStream(path.resolve('report_wallet_stars.csv'), { flags: 'w' });
  const wr = (a) => out.write(a.map(s => {
    if (s == null) return '';
    const v = String(s);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',') + '\n');
  wr(['wallet', 'total_stars', 'stars_w1', 'stars_w2', 'stars_w3', 'stars_w4', 'stars_w5', 'stars_w6', 'stars_w7', 'stars_w8']);

  let cursor = '0';
  const COUNT = 250; // 8 команд на адрес → держим меньше
  let rows = 0, pages = 0, t0 = Date.now();

  try {
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', 'user:verified:*', 'COUNT', String(COUNT));
      cursor = String(next || '0');
      if (Array.isArray(keys) && keys.length) {
        const addrs = keys.map(k => (k.split(':')[2] || '').toLowerCase());
        const pipe = client.pipeline();
        for (const a of addrs) { for (let w = 1; w <= 8; w++) pipe.scard('user:stars:' + a + ':' + w); }
        const res = await pipe.exec();
        for (let i = 0; i < addrs.length; i++) {
          let sTot = 0; const stars = [];
          for (let w = 0; w < 8; w++) {
            const idx = i * 8 + w;
            const v = res && res[idx] && res[idx][1];
            const n = typeof v === 'number' ? v : (Number(v || 0) || 0);
            stars.push(n); sTot += n;
          }
          wr([addrs[i], sTot, ...stars]);
          rows++;
        }
      }
      pages++;
      if (pages % 10 === 0) {
        const sec = Math.round((Date.now() - t0) / 1000);
        console.log('stars pages=' + pages + ' rows=' + rows + ' t=' + sec + 's');
      }
    } while (cursor !== '0');
  } finally {
    out.end();
    await client.quit().catch(() => {});
  }
  console.log('stars DONE rows=' + rows);
})().catch(e => { console.error(e); process.exit(1); });
