#!/usr/bin/env node
import { createPublicClient, http, parseAbi, isAddress } from "viem";

async function main(){
  const [contract, wallet, rpcUrlArg] = process.argv.slice(2);
  if (!contract || !wallet){
    console.error("Usage: node scripts/check-erc721-ownership.mjs <contract> <wallet> [rpcUrl]");
    process.exit(2);
  }
  if (!isAddress(contract) || !isAddress(wallet)){
    console.error("Invalid contract or wallet address");
    process.exit(2);
  }
  const rpcUrl = rpcUrlArg || process.env.NEXT_PUBLIC_RPC_URL || "https://dream-rpc.somnia.network/";
  const client = createPublicClient({ transport: http(rpcUrl) });
  const abi = parseAbi([
    "function balanceOf(address owner) view returns (uint256)",
  ]);
  try {
    const bal = await client.readContract({ address: contract, abi, functionName: "balanceOf", args: [wallet] });
    const hasAny = BigInt(bal) > 0n;
    console.log(JSON.stringify({ contract, wallet, balance: bal.toString(), ownsAny: hasAny }, null, 2));
  } catch (e){
    console.error("Read failed:", e?.message || e);
    process.exit(1);
  }
}

main();








