'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import TiltedCard from '@/components/TiltedCard';
import { Button } from '@/components/ui/Button';
import Tooltip from '@/components/ui/Tooltip';
import { useWriteContract, useWaitForTransactionReceipt, useReadContract, usePublicClient } from 'wagmi';
import { STARS_1155_ADDRESS, STARS_ABI, hasStarsContractConfigured, ERC1155_MIN_ABI } from '@/lib/contracts';

type ProfileStars = {
  starsByWeek?: Record<number, number>;
};

export default function StarMintModal({ open, onClose, address }: { open: boolean; onClose: () => void; address?: string }){
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starsCount, setStarsCount] = useState<number | null>(null);
  const [didMint, setDidMint] = useState(false);

  const hasAddress = !!address;
  const hasContract = hasStarsContractConfigured();
  // On-chain balance check to block repeat mint
  const { data: chainBal } = useReadContract({
    abi: ERC1155_MIN_ABI,
    address: hasContract ? (STARS_1155_ADDRESS as `0x${string}`) : undefined,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, 1n],
    query: { enabled: hasContract && !!address && open },
  });
  const alreadyMinted = (typeof chainBal === 'bigint' && chainBal > 0n) || didMint;
  const canMint = hasAddress && !loading && !alreadyMinted && (starsCount ?? 0) > 0;
  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: waitingTx } = useWaitForTransactionReceipt({ hash: txHash });
  const publicClient = usePublicClient();

  useEffect(() => {
    if (!open) return;
    if (!address) { setStarsCount(null); return; }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/profile?address=${address}`)
      .then(r => r.json())
      .then((j: ProfileStars) => {
        if (cancelled) return;
        const weeks = j?.starsByWeek || {};
        const total = Object.values(weeks).reduce((a, b) => a + (typeof b === 'number' ? b : 0), 0);
        setStarsCount(total);
      })
      .catch(() => { if (!cancelled) setError('Failed to load stars'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, address]);

  const onMint = async () => {
    try {
      setLoading(true);
      // Request intent (server-signed EIP-712)
      const res = await fetch('/api/stars/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ address, id: 1 })
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = String(j?.error || 'stars_intent_failed') + (j?.detail ? `: ${String(j.detail)}` : '');
        setError(msg);
        return;
      }
      if (!hasContract || !j?.signature || j.signature === '0x') {
        setDidMint(true);
        return;
      }
      // First simulate to surface clear revert reasons
      try {
        if (publicClient) {
          await publicClient.simulateContract({
            abi: STARS_ABI,
            address: STARS_1155_ADDRESS as `0x${string}`,
            functionName: 'mintWithSig',
            args: [address as `0x${string}`, 1n, BigInt(j.amount), BigInt(j.nonce), BigInt(j.deadline), j.signature as `0x${string}`],
            account: address as `0x${string}`,
          });
        }
      } catch (simErr: any) {
        const msg = simErr?.shortMessage || simErr?.message || 'Simulation failed';
        setError(String(msg));
        setLoading(false);
        return;
      }

      // Try to pre-estimate gas to avoid underestimation by some providers
      let gasLimit: bigint | undefined = undefined;
      try {
        if (publicClient && hasContract) {
          gasLimit = await publicClient.estimateContractGas({
            abi: STARS_ABI,
            address: STARS_1155_ADDRESS as `0x${string}`,
            functionName: 'mintWithSig',
            args: [address as `0x${string}`, 1n, BigInt(j.amount), BigInt(j.nonce), BigInt(j.deadline), j.signature as `0x${string}`],
            account: address as `0x${string}`,
          });
          // add a safety margin and floor
          gasLimit = (gasLimit * 2n); // +100%
          if (gasLimit < 600_000n) gasLimit = 600_000n;
        }
      } catch { /* fall back to default below */ }

      await writeContractAsync({
        address: STARS_1155_ADDRESS as `0x${string}`,
        abi: STARS_ABI,
        functionName: 'mintWithSig',
        args: [address as `0x${string}`, 1n, BigInt(j.amount), BigInt(j.nonce), BigInt(j.deadline), j.signature as `0x${string}`],
        ...(gasLimit ? { gas: gasLimit } as const : { gas: 600_000n } as const),
      });
      setDidMint(true);
      // Fire-and-forget confirm to update minted_total on server
      try {
        if (txHash) {
          await fetch('/api/stars/confirm', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address, txHash }),
          }).catch(() => {});
        }
      } catch { /* ignore */ }
    } catch (e) {
      const msg = (e && typeof e === 'object' && 'message' in e) ? String((e as any).message) : 'Mint failed';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const content = (
    <div className="fixed inset-0" style={{ zIndex: 2147483647 }}>
      <div className="absolute inset-0 bg-black/55 backdrop-blur-[14px]" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
        <button aria-label="Close" onClick={onClose} className="absolute top-4 right-4 inline-flex h-9 w-9 items-center justify-center rounded-[var(--radius)] border border-[color:var(--outline)] bg-[color:var(--card)] hover:bg-white/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]">✕</button>
        <div className="grid gap-6 place-items-center">
          <TiltedCard
            imageSrc={`/assets/stars.png`}
            altText={`Stars`}
            containerHeight="360px"
            containerWidth="360px"
            imageHeight="360px"
            imageWidth="360px"
            scaleOnHover={1.04}
            rotateAmplitude={10}
            showMobileWarning={false}
            showTooltip={false}
          />
          {(alreadyMinted || didMint) && (
            <div className="text-sm text-[color:var(--ok)] text-center">Minted</div>
          )}
          {error && (
            <div className="text-sm text-[color:var(--danger)] text-center max-w-[360px] break-words">{error}</div>
          )}
          <div className="text-sm text-center text-[color:var(--muted)]">
            {starsCount == null ? 'Loading…' : `You can mint ${starsCount} NFT${(starsCount || 0) === 1 ? '' : 's'}`}
          </div>
          <div className="flex justify-center mt-2">
            <Tooltip content={!canMint ? (error || (!hasAddress ? 'Connect wallet' : ((starsCount ?? 0) <= 0 ? 'No stars collected' : (alreadyMinted ? 'Already minted' : (didMint ? 'Minted' : null))))) : null}>
              <Button variant={canMint ? 'primary' : 'glass'} disabled={!canMint || loading || waitingTx} onClick={onMint}>
                {loading || waitingTx ? 'Processing…' : (canMint ? `Mint ${starsCount ?? 0}` : 'Mint (unavailable)')}
              </Button>
            </Tooltip>
          </div>
        </div>
      </div>
    </div>
  );

  if (typeof document !== 'undefined'){
    return createPortal(content, document.body);
  }
  return content;
}


