const fs=require("fs");
const path=require("path");
const Redis=require("ioredis");

(async()=>{
  const url=process.env.REDIS_URL||"";
  const redUrl=url.startsWith("redis://")?url.replace("redis://","rediss://"):url;
  const client=new Redis(redUrl,{ lazyConnect:true, maxRetriesPerRequest:1, enableOfflineQueue:false });
  try { await client.connect(); } catch(e){ console.error("connect fail", e?.message||e); process.exit(1); }

  const outPath=path.resolve("report_wallet_xp_and_stars.csv");
  const ws=fs.createWriteStream(outPath, { flags: "w" });
  const writeRow=(arr)=>{ const line=arr.map(s=>{ if(s==null) return ""; const v=String(s); return /[",\n]/.test(v)?`"${v.replace(/"/g,)}"`:v; }).join(","); ws.write(line+"\n"); };
  writeRow(["wallet","total_xp","total_stars","stars_w1","stars_w2","stars_w3","stars_w4","stars_w5","stars_w6","stars_w7","stars_w8"]);

  let cursor="0"; let pages=0; let total=0; const COUNT=1500; const start=Date.now();
  try {
    do{
      const [next, keys]=await client.scan(cursor, "MATCH", "user:verified:*", "COUNT", String(COUNT));
      cursor=String(next||"0");
      const kArr=Array.isArray(keys)?keys:[];
      if(kArr.length>0){
        const pipe=client.pipeline();
        const addrs=[];
        for(const k of kArr){ const addr=(k.split(":")[2]||"").toLowerCase(); addrs.push(addr); pipe.get(`user:xp:${addr}`); for(let w=1; w<=8; w++){ pipe.scard(`user:stars:${addr}:${w}`); } }
        const res=await pipe.exec();
        for(let i=0;i<kArr.length;i++){
          const base=i*9; const addr=addrs[i];
          const xpRaw=res?.[base]?.[1]; const xp=typeof xpRaw===number?xpRaw:Number(xpRaw||0)||0;
          const stars=[]; let sTotal=0; for(let w=0; w<8; w++){ const v=res?.[base+1+w]?.[1]; const n=typeof v===number?v:Number(v||0)||0; stars.push(n); sTotal+=n; }
          writeRow([addr,xp,sTotal,...stars]);
          total++;
        }
      }
      pages++;
      if(pages%5===0){ const ms=Date.now()-start; console.log(`pages=${pages}, wallets=${total}, cursor=${cursor}, ${Math.round(ms/1000)}s`); }
    } while(cursor!=="0");
  } catch(e){ console.error("scan error", e?.message||e); process.exit(1); }
  finally { ws.end(); await client.quit().catch(()=>{}); }

  const ms=Date.now()-start; console.log(`done: wrote ${outPath} wallets=${total} pages=${pages} in ${Math.round(ms/1000)}s`);
})();
