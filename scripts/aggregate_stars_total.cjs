const fs = require('fs');
const path = require('path');

function buildFromReport() {
  const src = path.resolve('report_wallet_stars.csv');
  if (!fs.existsSync(src) || fs.statSync(src).size === 0) return false;
  const lines = fs.readFileSync(src, 'utf8').trim().split(/\r?\n/);
  const out = ['wallet,total_stars'];
  for (let i = 1; i < lines.length; i++){
    const cols = lines[i].split(',');
    if (cols.length < 2) continue;
    out.push(`${cols[0]},${cols[1]}`);
  }
  fs.writeFileSync(path.resolve('report_wallet_stars_total.csv'), out.join('\n'));
  return true;
}

function buildFromRaw() {
  const src = path.resolve('stars_raw.csv');
  if (!fs.existsSync(src) || fs.statSync(src).size === 0) return false;
  const lines = fs.readFileSync(src, 'utf8').trim().split(/\r?\n/);
  const total = new Map();
  for (let i = 1; i < lines.length; i++){
    const cols = lines[i].split(',');
    if (cols.length < 3) continue;
    const w = cols[0].replace(/\"/g, '');
    const c = Number(cols[2].replace(/\"/g, '')) || 0;
    total.set(w, (total.get(w) || 0) + c);
  }
  const out = ['wallet,total_stars', ...Array.from(total, ([k, v]) => `${k},${v}`)];
  fs.writeFileSync(path.resolve('report_wallet_stars_total.csv'), out.join('\n'));
  return true;
}

if (!buildFromReport()){
  if (!buildFromRaw()){
    console.error('No stars source found (report_wallet_stars.csv or stars_raw.csv)');
    process.exit(1);
  }
}

console.log('Wrote report_wallet_stars_total.csv');



