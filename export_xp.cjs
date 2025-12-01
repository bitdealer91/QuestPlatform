const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

(async () => {
  const url = process.env.REDIS_URL || '';
  if (!url) { console.error('REDIS_URL not set'); process.exit(2); }
  const red = url.startsWith('redis://') ? url.replace('redis://', 'rediss://') : url;
  const client = new Redis(red, { lazyConnect: true, maxRetriesPerRequest: 1, enableOfflineQueue: false });
  await client.connect();

  const out = fs.createWriteStream(path.resolve('report_wallet_xp.csv'), { flags: 'w' });
  const wr = (a) => out.write(a.map(s => {
    if (s == null) return '';
    const v = String(s);
    return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
  }).join(',') + '\n');
  wr(['wallet', 'total_xp']);

  let cursor = '0';
  const COUNT = 900; // 1 команда на адрес
  let rows = 0, pages = 0, t0 = Date.now();

  try {
    do {
      const [next, keys] = await client.scan(cursor, 'MATCH', 'user:verified:*', 'COUNT', String(COUNT));
      cursor = String(next || '0');
      if (Array.isArray(keys) && keys.length) {
        const addrs = keys.map(k => (k.split(':')[2] || '').toLowerCase());
        const pipe = client.pipeline();
        for (const a of addrs) pipe.get('user:xp:' + a);
        const res = await pipe.exec();
        for (let i = 0; i < addrs.length; i++) {
          const xpRaw = res && res[i] && res[i][1];
          const xp = typeof xpRaw === 'number' ? xpRaw : (Number(xpRaw || 0) || 0);
          wr([addrs[i], xp]);
          rows++;
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
    await client.quit().catch(() => {});
  }
  console.log('xp DONE rows=' + rows);
})().catch(e => { console.error(e); process.exit(1); });
