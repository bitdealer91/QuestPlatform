const fs = require('fs');
const path = require('path');

async function main(){
  const BASE = process.env.BASE_URL || '';
  const TOKEN = process.env.ADMIN_TOKEN || '';
  if (!BASE || !TOKEN){
    console.error('Please set BASE_URL and ADMIN_TOKEN');
    process.exit(2);
  }

  // Aggregate per wallet in memory (126k wallets is fine)
  const agg = new Map(); // address -> { total: number, weeks: number[8] }

  let cursor = '0';
  do {
    const res = await fetch(`${BASE}/api/admin/stars/page`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: TOKEN, batch: 1000, cursor })
    });
    if (!res.ok){
      const t = await res.text().catch(() => '');
      throw new Error(`HTTP ${res.status} ${t}`);
    }
    const j = await res.json();
    const items = Array.isArray(j.items) ? j.items : [];
    for (const it of items){
      const addr = String(it.address || '').toLowerCase();
      const week = Number(it.week || 0);
      const count = Number(it.count || 0) || 0;
      if (!addr || !(week >= 1 && week <= 8)) continue;
      const rec = agg.get(addr) || { total: 0, weeks: Array(8).fill(0) };
      rec.total += count; rec.weeks[week - 1] = count;
      agg.set(addr, rec);
    }
    cursor = String(j.cursor || '0');
  } while (cursor !== '0');

  const outPath = path.resolve('report_wallet_stars.csv');
  const out = fs.createWriteStream(outPath, { flags: 'w' });
  const wr = (arr) => out.write(arr.join(',') + '\n');
  wr(['wallet','total_stars','stars_w1','stars_w2','stars_w3','stars_w4','stars_w5','stars_w6','stars_w7','stars_w8']);
  for (const [addr, rec] of agg.entries()){
    wr([addr, String(rec.total), ...rec.weeks.map(String)]);
  }
  out.end();
  console.log(`Wrote ${outPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); });



