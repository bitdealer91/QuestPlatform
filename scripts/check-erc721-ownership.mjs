#!/usr/bin/env node
import { createPublicClient, http, parseAbi } from 'viem';
import process from 'node:process';

const rpcUrlArg = process.argv[2];
const rpcUrl = rpcUrlArg || process.env.NEXT_PUBLIC_RPC_URL || "https://api.infra.mainnet.somnia.network/";

async function main(){
  const client = createPublicClient({ transport: http(rpcUrl) });
  console.log('Client ready', rpcUrl);
}

main();








