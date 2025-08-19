import { defineChain } from "viem";

export const somniaTestnet = defineChain({
	id: 50312,
	name: "Somnia Testnet",
	nativeCurrency: { name: "Somnia Test Token", symbol: "STT", decimals: 18 },
	rpcUrls: {
		default: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://dream-rpc.somnia.network/"] },
		public: { http: [process.env.NEXT_PUBLIC_RPC_URL || "https://dream-rpc.somnia.network/"] },
	},
	blockExplorers: {
		default: { name: "Shannon", url: "https://shannon-explorer.somnia.network/" },
	},
	testnet: true,
});
