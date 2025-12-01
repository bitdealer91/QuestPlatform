const fs=require('fs');
const path=require('path');
const inputPath=path.resolve('report_task_counts.csv');
const text=fs.readFileSync(inputPath,'utf8');

function parseCSV(s){
  const rows=[]; let row=[]; let field=''; let i=0; let inQ=false;
  while(i<s.length){
    const ch=s[i];
    if(inQ){
      if(ch==='"'){
        if(s[i+1]==='"'){ field+='"'; i+=2; continue; }
        inQ=false; i++; continue;
      }
      field+=ch; i++; continue;
    } else {
      if(ch==='"'){ inQ=true; i++; continue; }
      if(ch===','){ row.push(field); field=''; i++; continue; }
      if(ch==='\r'){ i++; continue; }
      if(ch==='\n'){ row.push(field); rows.push(row); row=[]; field=''; i++; continue; }
      field+=ch; i++; continue;
    }
  }
  if(field.length>0 || row.length>0){ row.push(field); rows.push(row); }
  return rows;
}

const rows=parseCSV(text);
if(rows.length===0){ console.error('No rows'); process.exit(1); }
const header=rows[0];
const idx={}; header.forEach((h,i)=>idx[h]=i);
function get(r,k){ return r[idx[k]] ?? ''; }

const items = rows.slice(1).map(r=>({
  group: String(get(r,'group')),
  task_id: String(get(r,'task_id')),
  title: String(get(r,'title')),
  week: Number(get(r,'week')||0),
  xp: Number(get(r,'xp')||0),
  star: String(get(r,'star'))==='true',
  mandatory: String(get(r,'mandatory'))==='true',
  participants: Number(get(r,'participants')||0)
})).filter(x=>x.task_id);

function fmtNum(n){ if(!Number.isFinite(n)) return ''; return n.toLocaleString('en-US'); }
function toCsvRow(arr){ return arr.map(v=>{ if(v==null) return ''; const s=String(v); return /[",\n]/.test(s)?`"${s.replace(/"/g,'""')}"`:s; }).join(','); }
function writeCSV(file, rows){ fs.writeFileSync(file, rows.map(toCsvRow).join('\n')); }

function sortItems(a,b){ if(a.week!==b.week) return a.week-b.week; if(b.participants!==a.participants) return b.participants-a.participants; return a.title.localeCompare(b.title); }

const byGroup = items.reduce((m,it)=>{ (m[it.group] ||= []).push(it); return m; },{});
const groups=['green_mandatory','starred','xp_only'];

for(const g of groups){
  const list=(byGroup[g]||[]).slice().sort(sortItems);
  const out=[[ 'week','task_id','title','xp','star','mandatory','participants' ]];
  for(const it of list){ out.push([it.week, it.task_id, it.title, it.xp, it.star, it.mandatory, fmtNum(it.participants)]); }
  writeCSV(path.resolve(`report_${g}.csv`), out);
}

const pretty=[];
for(const g of groups){
  const list=(byGroup[g]||[]).slice().sort(sortItems);
  pretty.push([`# ${g}`]);
  pretty.push([ 'week','task_id','title','xp','star','mandatory','participants' ]);
  for(const it of list){ pretty.push([it.week, it.task_id, it.title, it.xp, it.star, it.mandatory, fmtNum(it.participants)]); }
  pretty.push(['']);
}
writeCSV(path.resolve('report_task_counts_pretty.csv'), pretty);

console.log('Wrote:');
console.log(' -', path.resolve('report_green_mandatory.csv'));
console.log(' -', path.resolve('report_starred.csv'));
console.log(' -', path.resolve('report_xp_only.csv'));
console.log(' -', path.resolve('report_task_counts_pretty.csv'));
