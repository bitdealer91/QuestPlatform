export type WalletProgress = unknown;

export function loadProgress(address: string | undefined | null): WalletProgress | null {
	if (typeof window === "undefined" || !address) return null;
	try {
		const raw = localStorage.getItem(`somnia:progress:${address.toLowerCase()}`);
		return raw ? (JSON.parse(raw) as WalletProgress) : null;
	} catch {
		return null;
	}
}

export function saveProgress(address: string | undefined | null, state: WalletProgress): void {
	if (typeof window === "undefined" || !address) return;
	try {
		localStorage.setItem(`somnia:progress:${address.toLowerCase()}`, JSON.stringify(state));
	} catch {}
}
