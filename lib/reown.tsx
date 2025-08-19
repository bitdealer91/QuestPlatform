"use client";
import { createContext, useContext, useMemo } from "react";
import { createAppKit } from "@reown/appkit";
import { WagmiAdapter } from "@reown/appkit-adapter-wagmi";
import { http, WagmiProvider } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { somniaTestnet } from "./chains";

const projectId = process.env.NEXT_PUBLIC_REOWN_PROJECT_ID as string | undefined;

type Ctx = { appKit: ReturnType<typeof createAppKit>; wagmiConfig: any; queryClient: QueryClient } | null;
const ReownContext = createContext<Ctx>(null);

export function AppKitProvider({ children }: { children: React.ReactNode }) {
	const value = useMemo(() => {
		if (!projectId) return null;
		const adapter = new WagmiAdapter({
			projectId,
			networks: [somniaTestnet],
			transports: { [somniaTestnet.id]: http(process.env.NEXT_PUBLIC_RPC_URL || "https://dream-rpc.somnia.network/") },
		});

		const appKit = createAppKit({
			adapters: [adapter],
			projectId,
			networks: [somniaTestnet],
			features: { analytics: false },
			metadata: {
				name: "Somnia Quest Portal",
				description: "Board-game quests for Somnia Testnet",
				url: "https://quest.somnia.example",
				icons: ["/assets/somnia-logo.svg"],
			},
			themeMode: "dark",
		});

		const queryClient = new QueryClient();
		return { appKit, wagmiConfig: (adapter as any).wagmiConfig, queryClient } as Ctx;
	}, []);

	if (!value) return children as any;
	const { wagmiConfig, queryClient } = value;
	return (
		<ReownContext.Provider value={value}>
			<WagmiProvider config={wagmiConfig}>
				<QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
			</WagmiProvider>
		</ReownContext.Provider>
	);
}

export function useAppKit() {
	return useContext(ReownContext);
}
