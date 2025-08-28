"use client";
import { useMemo } from "react";
import { WagmiProvider, createConfig, http } from "wagmi";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { somniaMainnet } from "./chains";

const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || "https://api.infra.mainnet.somnia.network/";

const config = createConfig({
  chains: [somniaMainnet],
  transports: { [somniaMainnet.id]: http(rpcUrl) },
});

export function WagmiRoot({ children }: { children: React.ReactNode }){
  const queryClient = useMemo(() => new QueryClient(), []);
  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </WagmiProvider>
  );
}
