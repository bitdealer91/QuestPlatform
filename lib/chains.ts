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
