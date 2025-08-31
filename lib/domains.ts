import { createPublicClient, http, parseAbi } from 'viem';

const DEFAULT_RPC = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.infra.mainnet.somnia.network/';

export async function resolvePrimaryDomain(address: `0x${string}`, options?: {
  rpcUrl?: string;
  registry?: `0x${string}`;
  functionSignature?: string; // e.g. "function getDomainsOf(address) view returns (string[])"
  functionName?: string; // e.g. "getDomainsOf"
}): Promise<string | null> {
  const rpcUrl = options?.rpcUrl || DEFAULT_RPC;
  const registry = options?.registry;
  if (!registry) return null;

  const functionSignature = options?.functionSignature || 'function getDomainsOf(address) view returns (string[])';
  const functionName = options?.functionName || 'getDomainsOf';
  const abi = parseAbi([functionSignature]);
  const client = createPublicClient({ transport: http(rpcUrl) });
  try {
    const result: unknown = await client.readContract({ address: registry, abi, functionName, args: [address] });
    if (Array.isArray(result) && result.length > 0) {
      // Return the first one as primary for now
      return String(result[0]);
    }
    return null;
  } catch {
    return null;
  }
}



