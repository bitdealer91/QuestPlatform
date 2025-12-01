#!/usr/bin/env node
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { getContract } from 'viem';
import { readFileSync } from 'fs';

// Load env from .env.local if present
try {
  const dot = readFileSync('.env.local', 'utf8');
  for (const line of dot.split(/\r?\n/)){
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    const k = m[1]; const v = m[2];
    if (!process.env[k]) process.env[k] = v;
  }
} catch {}

const args = Object.fromEntries(process.argv.slice(2).map(s => {
  const [k, v] = s.split('=');
  return [k.replace(/^--/, ''), v ?? ''];
}));

const address = (args.address || '').trim();
const base = (args.base || '').trim();
const rpc = (process.env.NEXT_PUBLIC_RPC_URL || args.rpc || 'https://api.infra.mainnet.somnia.network/').trim();
const pkRaw = (process.env.DEPLOYER_PRIVATE_KEY || process.env.OWNER_PRIVATE_KEY || '').trim();

if (!/^0x[0-9a-fA-F]{40}$/.test(address) || !base){
  console.error('Usage: node scripts/set-base-uri.mjs --address 0x... --base https://odyssey.somnia.network/metadata/keys/');
  process.exit(2);
}
if (!/^0x[0-9a-fA-F]{64}$/.test(pkRaw)){
  console.error('Missing or invalid DEPLOYER_PRIVATE_KEY in .env.local');
  process.exit(2);
}

const somnia = {
  id: 5031,
  name: 'Somnia Mainnet',
  nativeCurrency: { name: 'Somnia', symbol: 'SOMI', decimals: 18 },
  rpcUrls: { default: { http: [rpc] } },
};

const abi = [
  { type: 'function', name: 'setBaseURI', stateMutability: 'nonpayable', inputs: [{ name: 'u', type: 'string' }], outputs: [] },
  { type: 'function', name: 'uri', stateMutability: 'view', inputs: [{ name: 'id', type: 'uint256' }], outputs: [{ name: '', type: 'string' }] }
];

const account = privateKeyToAccount(pkRaw);
const client = createWalletClient({ account, chain: somnia, transport: http(rpc) });

const c = getContract({ address, abi, client });

const hash = await c.write.setBaseURI([base]);
console.log('tx:', hash);
const receipt = await client.waitForTransactionReceipt({ hash });
console.log('receipt status:', receipt.status);

const newUri = await c.read.uri([1n]);
console.log('uri(1):', newUri);



























