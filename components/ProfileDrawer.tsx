'use client';
import Drawer from '@/components/ui/Drawer';
import { Button } from '@/components/ui/Button';
import { Copy, ExternalLink } from 'lucide-react';

export default function ProfileDrawer({ open, onClose, address }: { open: boolean; onClose: () => void; address?: string }){
	const short = address ? `${address.slice(0,6)}…${address.slice(-4)}` : 'Not connected';
	return (
		<Drawer open={open} onClose={onClose} size="lg" title="Profile" subtitle={short}>
			<div className="p-5 grid gap-4">
				<div className="flex items-center gap-3">
					<div className="h-12 w-12 rounded-xl bg-white/10" />
					<div className="flex items-center gap-2">
						<Button variant="glass" className="gap-2" onClick={() => address && navigator.clipboard.writeText(address)}><Copy className="h-4 w-4" /> Copy</Button>
						<Button variant="glass" className="gap-2" onClick={() => address && window.open(`https://shannon-explorer.somnia.network/address/${address}`, '_blank') }><ExternalLink className="h-4 w-4" /> Explorer</Button>
					</div>
				</div>
				<div className="grid grid-cols-2 md:grid-cols-4 gap-3">
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]"><div className="text-xs text-[color:var(--muted)]">Total Stars</div><div className="text-lg font-semibold">0</div></div>
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]"><div className="text-xs text-[color:var(--muted)]">Total XP</div><div className="text-lg font-semibold">0</div></div>
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]"><div className="text-xs text-[color:var(--muted)]">Claimable</div><div className="text-lg font-semibold">0 SOMI</div></div>
					<div className="rounded-xl p-3 bg-black/25 border border-[color:var(--outline)]"><div className="text-xs text-[color:var(--muted)]">Weeks</div><div className="text-lg font-semibold">0</div></div>
				</div>
				<div className="mt-2 text-sm text-[color:var(--muted)]">Recent verifications will appear here.</div>
			</div>
		</Drawer>
	);
}


