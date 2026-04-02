#!/usr/bin/env node
/* Locally sign and send Stars mint txs without server secrets.
   Env:
     BASE_URL=https://odyssey.somnia.network
     SIGNER_PRIVATE_KEY=0x...
     RELAYER_PRIVATE_KEY=0x...   (or DEPLOYER_PRIVATE_KEY)
     STARS_ADDRESS=0x...         (defaults to NEXT_PUBLIC_STARS_1155_ADDRESS)
     ADDRESSES=0x...,0x...,...   (comma-separated) or pass a file path as first arg with one address per line
*/
const { ethers } = require('ethers');
const fs = require('fs');

const BASE_URL = process.env.BASE_URL || 'https://odyssey.somnia.network';
const SIGNER_PK = process.env.SIGNER_PRIVATE_KEY || '';
const RELAYER_PK = process.env.RELAYER_PRIVATE_KEY || process.env.DEPLOYER_PRIVATE_KEY || '';
const STARS_ADDRESS = (process.env.STARS_ADDRESS || process.env.NEXT_PUBLIC_STARS_1155_ADDRESS || '').toLowerCase();
const RPC_URL = process.env.NEXT_PUBLIC_RPC_URL || process.env.RPC_URL || 'https://api.infra.mainnet.somnia.network/';
const CHAIN_ID = Number(process.env.CHAIN_ID || 5031);
const ADDRESSES_ENV = String(process.env.ADDRESSES || '').trim();
const INPUT_FILE = process.argv[2] || '';

if (!/^0x[0-9a-fA-F]{64}$/.test(SIGNER_PK)) { console.error('SIGNER_PRIVATE_KEY missing/invalid'); process.exit(1); }
if (!/^0x[0-9a-fA-F]{64}$/.test(RELAYER_PK)) { console.error('RELAYER_PRIVATE_KEY/DEPLOYER_PRIVATE_KEY missing/invalid'); process.exit(1); }
if (!/^0x[0-9a-fA-F]{40}$/.test(STARS_ADDRESS)) { console.error('STARS_ADDRESS/NEXT_PUBLIC_STARS_1155_ADDRESS missing/invalid'); process.exit(1); }

function loadAddresses(){
  if (INPUT_FILE) {
    try {
      const txt = fs.readFileSync(INPUT_FILE, 'utf8');
      return txt.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    } catch {
      console.error('Failed to read file:', INPUT_FILE);
      process.exit(1);
    }
  }
  if (ADDRESSES_ENV) {
    return ADDRESSES_ENV.split(',').map(s => s.trim()).filter(Boolean);
  }
  console.error('Provide addresses via ADDRESSES env or a file path as first argument');
  process.exit(1);
}

async function jfetch(url, init) {
  const r = await fetch(url, init);
  let j = null;
  try { j = await r.json(); } catch {}
  return { ok: r.ok, status: r.status, json: j };
}

const STARS_ABI = [
  { type: 'function', name: 'mintWithSig', stateMutability: 'nonpayable', inputs: [
    { name: 'to', type: 'address' },
    { name: 'id', type: 'uint256' },
    { name: 'amount', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'deadline', type: 'uint256' },
    { name: 'signature', type: 'bytes' },
  ], outputs: [] },
];

async function main(){
  const provider = new ethers.JsonRpcProvider(RPC_URL, CHAIN_ID);
  const relayer = new ethers.Wallet(RELAYER_PK, provider);
  const signer = new ethers.Wallet(SIGNER_PK);
  const contract = new ethers.Contract(STARS_ADDRESS, STARS_ABI, relayer);

  const list = Array.from(new Set(loadAddresses().map(a => a.toLowerCase()))).filter(a => /^0x[0-9a-f]{40}$/.test(a));
  for (const addr of list) {
    try {
      const prof = await jfetch(`${BASE_URL}/api/profile?address=${addr}`);
      if (!prof.ok) { console.log(addr, 'profile_fail', prof.status); continue; }
      const weeks = (prof.json?.starsByWeek || {});
      const total = Object.values(weeks).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);

      const stat = await jfetch(`${BASE_URL}/api/stars/status?address=${addr}`);
      if (!stat.ok) { console.log(addr, 'status_fail', stat.status); continue; }
      const mintedTotal = Number(stat.json?.mintedTotal || 0) || 0;

      const amount = Math.max(0, total - mintedTotal);
      if (amount <= 0) { console.log(addr, 'skip', { total, mintedTotal, amount }); continue; }

      const id = 1;
      const now = Math.floor(Date.now() / 1000);
      const deadline = now + 300;
      const nonce = Number(BigInt.asUintN(32, BigInt(ethers.keccak256(ethers.toUtf8Bytes(`${addr}:${id}:${amount}:${now}`)))));

      const domain = { name: 'OdysseyStars', version: '1', chainId: CHAIN_ID, verifyingContract: STARS_ADDRESS };
      const types = {
        Mint: [
          { name: 'to', type: 'address' },
          { name: 'id', type: 'uint256' },
          { name: 'amount', type: 'uint256' },
          { name: 'nonce', type: 'uint256' },
          { name: 'deadline', type: 'uint256' },
          { name: 'chainId', type: 'uint256' },
          { name: 'verifyingContract', type: 'address' },
        ],
      };
      const message = {
        to: addr,
        id: BigInt(id),
        amount: BigInt(amount),
        nonce: BigInt(nonce),
        deadline: BigInt(deadline),
        chainId: BigInt(CHAIN_ID),
        verifyingContract: STARS_ADDRESS,
      };

      const signature = await signer.signTypedData(domain, types, message);
      const gas = await contract.mintWithSig.estimateGas(addr, id, amount, nonce, deadline, signature).catch(() => null);
      const tx = await contract.mintWithSig(addr, id, amount, nonce, deadline, signature, {
        gasLimit: gas ? gas * 2n : 600000n,
      });
      console.log(addr, 'sent', { amount, tx: tx.hash });
      await tx.wait();
      console.log(addr, 'confirmed');
      // small gap
      await new Promise(r => setTimeout(r, 300));
    } catch (e) {
      console.log(addr, 'error', String(e?.shortMessage || e?.message || e));
    }
  }
}

main().catch((e) => { console.error(e); process.exit(1); });




