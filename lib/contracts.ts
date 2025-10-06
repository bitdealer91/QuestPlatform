export const KEYS_1155_ADDRESS = (process.env.NEXT_PUBLIC_KEYS_1155_ADDRESS || '') as `0x${string}` | '';

// Minimal ERC-1155 ABI for balanceOf; extend later for mint
export const ERC1155_MIN_ABI = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [ { "name": "account", "type": "address" }, { "name": "id", "type": "uint256" } ], "outputs": [ { "name": "", "type": "uint256" } ] }
] as const;

export function hasKeysContractConfigured(): boolean {
  return typeof KEYS_1155_ADDRESS === 'string' && KEYS_1155_ADDRESS.length > 0;
}

// Keys1155 write ABI (mint)
export const KEYS_ABI = [
  { "type": "function", "name": "balanceOf", "stateMutability": "view", "inputs": [ { "name": "account", "type": "address" }, { "name": "id", "type": "uint256" } ], "outputs": [ { "name": "", "type": "uint256" } ] },
  { "type": "function", "name": "mintWithSig", "stateMutability": "nonpayable", "inputs": [ { "name": "to", "type": "address" }, { "name": "id", "type": "uint256" }, { "name": "nonce", "type": "uint256" }, { "name": "deadline", "type": "uint256" }, { "name": "signature", "type": "bytes" } ], "outputs": [] }
] as const;


