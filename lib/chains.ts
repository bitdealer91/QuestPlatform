import { defineChain } from "viem";

export const somniaMainnet = defineChain({
	id: 5031,
	name: "Somnia Mainnet",
	nativeCurrency: { name: "Somnia", symbol: "SOMI", decimals: 18 },
	rpcUrls: {
		default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://api.infra.mainnet.somnia.network/"] },
		public: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://api.infra.mainnet.somnia.network/"] },
	},
	blockExplorers: {
		default: { name: "Somnia Explorer", url: "https://explorer.somnia.network/" },
	},
	testnet: false,
});

// Optional Multicall3 override for faster reads (not strictly required for mint MVP)
export const SOMNIA_MULTICALL3 = (process.env.NEXT_PUBLIC_MULTICALL3 || "0x5e44F178E8cF9B2F5409B6f18ce936aB817C5a11") as `0x${string}`;
