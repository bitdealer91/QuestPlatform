const fs = require('fs');
const path = require('path');
const Redis = require('ioredis');

(async () => {
  const REDIS_URL = process.env.REDIS_URL || '';
  if (!REDIS_URL) {
    console.error('Please set REDIS_URL');
    process.exit(2);
  }

  // Input wallets source
  const walletsCsvPath = path.resolve('report_airdrop_unlocked_by_wallet.csv');
  if (!fs.existsSync(walletsCsvPath)) {
    console.error(`Missing ${walletsCsvPath}`);
    process.exit(2);
  }

  // Prepare Redis client (Upstash usually requires TLS)
  const rediss = REDIS_URL.startsWith('redis://') ? REDIS_URL.replace('redis://', 'rediss://') : REDIS_URL;
  const client = new Redis(rediss, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    // Make TLS permissive for environments lacking CA bundle
    tls: { rejectUnauthorized: false },
  });
  try {
    await client.connect();
  } catch (e) {
    console.error('Failed to connect:', e?.message || e);
    process.exit(1);
  }

  // Read wallets from the first column of CSV (skip header)
  const text = fs.readFileSync(walletsCsvPath, 'utf8');
  const wallets = text
    .split('\n')
    .slice(1)
    .map(line => (line.split(',')[0] || '').replace(/[\r"]/g, '').trim().toLowerCase())
    .filter(Boolean);

  const outPath = path.resolve('report_wallet_xp.csv');
  const needHeader = !fs.existsSync(outPath) || fs.statSync(outPath).size === 0;
  const out = fs.createWriteStream(outPath, { flags: needHeader ? 'w' : 'a' });
  const toCsv = (arr) => arr.map(v => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  }).join(',') + '\n';
  if (needHeader) out.write(toCsv(['wallet', 'total_xp']));

  const BATCH = 800;
  let written = 0;
  for (let i = 0; i < wallets.length; i += BATCH) {
    const slice = wallets.slice(i, i + BATCH);
    const pipe = client.pipeline();
    for (const addr of slice) pipe.get('user:xp:' + addr);
    const res = await pipe.exec();
    for (let j = 0; j < slice.length; j++) {
      const addr = slice[j];
      const xpRaw = res && res[j] && res[j][1];
      const xp = (typeof xpRaw === 'number') ? xpRaw : (Number(xpRaw || 0) || 0);
      out.write(toCsv([addr, xp]));
      written++;
    }
    if ((i / BATCH) % 10 === 0) {
      process.stdout.write(`Processed ${Math.min(i + BATCH, wallets.length)}/${wallets.length} wallets, rows=${written}\n`);
    }
  }

  out.end();
  await client.quit().catch(() => {});
  console.log(`XP export complete. Wrote ${written} rows to ${outPath}`);
})().catch((e) => { console.error(e); process.exit(1); });





