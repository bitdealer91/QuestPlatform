"use client";
import { useEffect, useState } from 'react';
import { resolvePrimaryDomain } from '@/lib/domains';
import { useAccount } from 'wagmi';

type Options = {
  registry?: `0x${string}`;
  rpcUrl?: string;
};

export function useDomain(options?: Options){
  const { address } = useAccount();
  const [domain, setDomain] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!address) { setDomain(null); return; }
      const name = await resolvePrimaryDomain(address as `0x${string}`, options);
      if (!cancelled) setDomain(name);
    })();
    return () => { cancelled = true; };
  }, [address, options?.registry, options?.rpcUrl]);
  return domain;
}



