#!/usr/bin/env node
import { createPublicClient, http, getContract } from 'viem';

const args = Object.fromEntries(process.argv.slice(2).map(s => {
  const [k, v] = s.split('=');
  return [k.replace(/^--/, ''), v ?? ''];
}));

const address = (args.address || '').trim();
const id = Number(args.id || '1');
const rpc = (process.env.NEXT_PUBLIC_RPC_URL || args.rpc || 'https://api.infra.mainnet.somnia.network/').trim();
if (!/^0x[0-9a-fA-F]{40}$/.test(address) || !Number.isInteger(id)){
  console.error('Usage: node scripts/read-token-uri.mjs --address 0x... --id 1 [--rpc https://...]');
  process.exit(2);
}

const ERC1155_URI_ABI = [
  { type: 'function', name: 'uri', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] }
];

const client = createPublicClient({ transport: http(rpc) });

try {
  const c = getContract({ address, abi: ERC1155_URI_ABI, client });
  const uri = await c.read.uri([BigInt(id)]);
  console.log('tokenURI:', uri);
  try {
    const res = await fetch(uri);
    console.log('meta:', res.status, res.headers.get('content-type'));
    const j = await res.json().catch(() => null);
    if (j) {
      console.log('meta.name:', j.name);
      console.log('meta.image:', j.image);
      if (j.image) {
        const rimg = await fetch(j.image);
        console.log('image:', rimg.status, rimg.headers.get('content-type'), rimg.headers.get('content-length'));
      }
    }
  } catch (e) {
    console.log('fetch meta failed:', e?.message || String(e));
  }
} catch (e) {
  console.error('read uri failed:', e?.message || String(e));
  process.exit(1);
}



























