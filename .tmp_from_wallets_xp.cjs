const fs=require(fs);
const path=require(path);
const Redis=require(ioredis);
(async()=>{
  const url=process.env.REDIS_URL||;
  if(!url){ console.error(REDIS_URL
