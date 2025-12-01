const fs=require("fs"), path=require("path"), Redis=require("ioredis");
(async()=>{
  const REDIS=process.env.REDIS_URL||"redis://default:AVW5AAIncDFhMWI4YzI5M2FmYjM0NjIzODUxOWM5NzViZjI4NzczZnAxMjE5NDU@closing-buffalo-21945.upstash.io:6379";
  const red=REDIS.replace("redis://","rediss://");
  const csv=fs.readFileSync("report_airdrop_unlocked_by_wallet.csv","utf8");
  const wallets=csv.split("\n").slice(1).map(l=>l.split(",")[0].replace(/\r|\"/g,"").trim().toLowerCase()).filter(Boolean).slice(0,3000);
  const c=new (require("ioredis"))(red,{lazyConnect:true,maxRetriesPerRequest:1,enableOfflineQueue:false}); await c.connect();
  const file="report_wallet_xp.csv";
  const needHeader=!fs.existsSync(file) || fs.statSync(file).size===0;
  const out=fs.createWriteStream(file,{flags: needHeader?"w":"a"});
  const wr=a=>out.write(a.map(s=>{const v=String(s??"");return /[",\n]/.test(v)?`"${v.replace(/"/g,)}"`:v}).join(",")+"\n");
  if(needHeader) wr(["wallet","total_xp"]);
  const B=600; let rows=0;
  for(let i=0;i<wallets.length;i+=B){ const chunk=wallets.slice(i,i+B); const p=c.pipeline(); chunk.forEach(a=>p.get(`user:xp:${a}`)); const r=await p.exec(); for(let j=0;j<chunk.length;j++){ const xpRaw=r?.[j]?.[1]; const xp=typeof xpRaw===number?xpRaw:Number(xpRaw||0)||0; wr([chunk[j], xp]); rows++; } }
  out.end(); await c.quit(); console.log("xp wrote rows", rows);
})();
