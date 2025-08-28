"use client";
import { useEffect } from "react";
import { useAccount, useChainId, useSwitchChain } from "wagmi";

const SOMNIA_MAINNET_ID = 5031;

export default function NetworkGuard(){
  const { isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChainAsync } = useSwitchChain();

  useEffect(() => {
    if (!isConnected) return;
    if (chainId && chainId !== SOMNIA_MAINNET_ID){
      switchChainAsync({ chainId: SOMNIA_MAINNET_ID }).catch(() => {});
    }
  }, [isConnected, chainId, switchChainAsync]);

  return null;
}

