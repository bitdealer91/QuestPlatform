#!/usr/bin/env node
/* Batch send Stars via admin endpoint based on Redis-derived totals */
const BASE_URL = process.env.BASE_URL || 'https://odyssey.somnia.network';
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';
if (!ADMIN_TOKEN) {
  console.error('Missing ADMIN_TOKEN env');
  process.exit(1);
}

const ADDRESSES = Array.from(new Set([
  '0xC66b42Da7A4eaFd5B20800337D17750eD365bB34',
  '0x7ae44AaF193f8889b979206b6a5ACcC66a52e7eF',
  '0x16b9b974Ed6aE29793f0A12FBE4926A28EFB2aDc',
  '0x132af0452A9B8B61777421bF77c41FbBAbF8527a',
  '0x0112B5Ac3322ab88C9AAC3B86Ac9F85bA4930b00',
  '0xFA1A10c1A1d9e2219E912177D33C650CFF67A434',
  '0x7C6f8D8F95713DA03DB8B8c11F9b731B4FdBe23E',
  '0x355c50DF7bc70b8C14BeBAbe59Af1Dd8Fd5fc3eF',
  '0xBAf7B6d55fA1e8fC7a658A3143C5e0Db593d8926',
  '0xb237db8dE67cf1a8f30e749EB3E106D63fd91768',
  '0xcfF4b42ed0935C5e319fb1975E756683d7F809ac',
  '0x9f663a768da2bc9980698bd5ceff945578328caa',
  '0xD8b73c942b14D34D7eBf481aD5331979C181E945',
  '0x83dF90288c0e12610b087de48C808398672451Ec',
  '0x2e1bc66cd7243ab66738a17e6f58cc8389f03064',
  '0x8880e2f10306fa75c1595f3783708446677e703b',
  '0xb401afd82f1262437e04cc031e77e24f742954df',
]));

async function jfetch(url, init) {
  const r = await fetch(url, init);
  let j = null;
  try { j = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, json: j };
}

async function main(){
  for (const addr of ADDRESSES) {
    const address = addr.toLowerCase();
    try {
      // profile: total stars collected
      const prof = await jfetch(`${BASE_URL}/api/profile?address=${address}`);
      if (!prof.ok) { console.log(address, 'profile_fail', prof.status); continue; }
      const weeks = (prof.json?.starsByWeek || {});
      const total = Object.values(weeks).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
      // status: server minted total
      const stat = await jfetch(`${BASE_URL}/api/stars/status?address=${address}`);
      if (!stat.ok) { console.log(address, 'status_fail', stat.status); continue; }
      const mintedTotal = Number(stat.json?.mintedTotal || 0) || 0;
      const amount = Math.max(0, total - mintedTotal);
      if (amount <= 0) {
        console.log(address, 'skip', { total, mintedTotal, amount });
        continue;
      }
      // send via admin endpoint
      const body = { token: ADMIN_TOKEN, address, amount, id: 1, wait: true };
      const send = await jfetch(`${BASE_URL}/api/admin/stars/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!send.ok) {
        console.log(address, 'send_fail', send.status, send.json);
      } else {
        console.log(address, 'sent', { amount, tx: send.json?.hash });
      }
      // small delay to avoid provider rate limits
      await new Promise(res => setTimeout(res, 500));
    } catch (e) {
      console.log(address, 'error', String(e?.message || e));
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });


