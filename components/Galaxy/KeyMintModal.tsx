'use client';
import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import TiltedCard from '@/components/TiltedCard';
import { Button } from '@/components/ui/Button';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { ERC1155_MIN_ABI, KEYS_1155_ADDRESS, hasKeysContractConfigured, KEYS_ABI } from '@/lib/contracts';
import Tooltip from '@/components/ui/Tooltip';

type Eligibility = {
  eligible: boolean;
  minted?: boolean;
  reason?: string;
};

export default function KeyMintModal({ open, onClose, weekId, address, initialEligible }: { open: boolean; onClose: () => void; weekId: number; address?: string; initialEligible?: boolean }){
  const [loading, setLoading] = useState(false);
  const [elig, setElig] = useState<Eligibility | null>(initialEligible != null ? { eligible: initialEligible } : null);
  const [error, setError] = useState<string | null>(null);
  const [didMint, setDidMint] = useState(false);

  const enabled = useMemo(() => String(process.env.NEXT_PUBLIC_ENABLE_MINT_DEV || '0').toLowerCase() === '1' || String(process.env.NEXT_PUBLIC_ENABLE_MINT_DEV || '0').toLowerCase() === 'true', []);

  // Check on-chain balance if contract is configured (dev can work without it)
  const hasContract = hasKeysContractConfigured();
  const { data: bal } = useReadContract({
    abi: ERC1155_MIN_ABI,
    address: hasContract ? (KEYS_1155_ADDRESS as `0x${string}`) : undefined,
    functionName: 'balanceOf',
    args: [address as `0x${string}`, BigInt(weekId)],
    query: { enabled: hasContract && !!address && open },
  });

  const { writeContractAsync, data: txHash } = useWriteContract();
  const { isLoading: waitingTx } = useWaitForTransactionReceipt({ hash: txHash });

  useEffect(() => {
    if (!open) return;
    if (!address) { setElig(null); return; }
    // Если eligibility уже известен из HUD, не делаем повторный запрос
    if (initialEligible !== undefined) {
      setElig({ eligible: initialEligible });
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/mint/eligibility?address=${address}&week=${weekId}`)
      .then(r => r.json())
      .then((j) => { if (!cancelled) setElig(j as Eligibility); })
      .catch(() => { if (!cancelled) setError('Failed to load eligibility'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [open, address, weekId, initialEligible]);

  const alreadyMinted = (typeof bal === 'bigint' && bal > 0n) || elig?.minted || didMint;
  const isEligibleNow = (elig?.eligible ?? initialEligible) === true;
  const hasAddress = !!address;
  const canMint = enabled && isEligibleNow && !alreadyMinted && hasAddress;

  const onMint = async () => {
    try {
      setLoading(true);
      // Dev: request intent; in prod this returns a real signature to submit on-chain
      const res = await fetch('/api/mint/intent', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ address, week: weekId }) });
      const j = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg = String(j?.error || 'mint_intent_failed') + (j?.detail ? `: ${String(j.detail)}` : '');
        setError(msg);
        return;
      }
      // If no contract is configured or signature is empty, mark as minted to test UI
      if (!hasContract || !j?.signature || j.signature === '0x') {
        setDidMint(true);
        return;
      }
      const tx = await writeContractAsync({
        address: KEYS_1155_ADDRESS as `0x${string}`,
        abi: KEYS_ABI,
        functionName: 'mintWithSig',
        args: [address as `0x${string}`, BigInt(weekId), BigInt(j.nonce), BigInt(j.deadline), j.signature as `0x${string}`],
      });
      // Wait is handled by useWaitForTransactionReceipt; we optimistically set minted after tx hash
      setDidMint(true);
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
            imageSrc={`/assets/keys/w${weekId}.png`}
            altText={`Week ${weekId} Key`}
            containerHeight="360px"
            containerWidth="360px"
            imageHeight="360px"
            imageWidth="360px"
            scaleOnHover={1.04}
            rotateAmplitude={10}
            showMobileWarning={false}
            showTooltip={false}
          />
          {alreadyMinted && (
            <div className="text-sm text-[color:var(--ok)] text-center">Minted</div>
          )}
          {error && (
            <div className="text-sm text-[color:var(--danger)] text-center max-w-[360px] break-words">{error}</div>
          )}
          <div className="flex justify-center mt-2">
            <Tooltip content={!canMint ? (error || (!hasAddress ? 'Connect wallet' : (elig?.reason || 'Not available'))) : null}>
              <Button variant={canMint ? 'primary' : 'glass'} disabled={!canMint || loading || waitingTx} onClick={onMint}>
                {loading ? 'Processing…' : (canMint ? 'Mint' : 'Mint (unavailable)')}
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



