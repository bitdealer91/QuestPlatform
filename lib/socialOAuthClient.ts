import type { SocialPlatform } from '@/lib/social';

export const SOCIAL_OAUTH_MESSAGE = 'somnia-social-oauth' as const;
export const SOCIAL_OAUTH_CHANNEL = 'somnia-social-oauth-channel';
export const ODYSSEY_SOCIAL_OAUTH_EVENT = 'odyssey:social-oauth-done';

/** OAuth child window/tab open; VideoLoader skips while present (popup only). */
export const OAUTH_POPUP_FLAG = 'odyssey_oauth_popup_v1';

export type SocialOAuthMessage =
	| { type: typeof SOCIAL_OAUTH_MESSAGE; ok: true; platform: SocialPlatform }
	| { type: typeof SOCIAL_OAUTH_MESSAGE; ok: false; error: string };

/** X opens in a new tab (better UX than narrow popup). Discord keeps popup. */
export function usesOAuthTab(platform: SocialPlatform): boolean {
	return platform === 'twitter';
}

export function isSocialOAuthMessage(data: unknown): data is SocialOAuthMessage {
	if (!data || typeof data !== 'object') return false;
	const d = data as { type?: string; ok?: boolean };
	return d.type === SOCIAL_OAUTH_MESSAGE && typeof d.ok === 'boolean';
}

export function oauthDoneUrl(
	origin: string,
	params: { connected?: SocialPlatform; error?: string },
): string {
	const u = new URL('/social/oauth-done', origin);
	if (params.connected) u.searchParams.set('connected', params.connected);
	if (params.error) u.searchParams.set('error', params.error);
	return u.toString();
}

export function openSocialOAuthPopup(url: string): Window | null {
	const w = 520;
	const h = 720;
	const left = Math.round(window.screenX + (window.outerWidth - w) / 2);
	const top = Math.round(window.screenY + (window.outerHeight - h) / 2);
	const features = `popup=yes,width=${w},height=${h},left=${left},top=${top}`;
	try {
		window.sessionStorage.setItem(OAUTH_POPUP_FLAG, '1');
	} catch {
		/* noop */
	}
	return window.open(url, 'somnia_social_oauth', features);
}

/** New tab — keep opener for postMessage (no noopener). */
export function openSocialOAuthTab(url: string): Window | null {
	return window.open(url, '_blank');
}

export function broadcastOAuthResult(payload: SocialOAuthMessage): void {
	try {
		const ch = new BroadcastChannel(SOCIAL_OAUTH_CHANNEL);
		ch.postMessage(payload);
		ch.close();
	} catch {
		/* noop */
	}
}

export function deliverOAuthResult(payload: SocialOAuthMessage): void {
	broadcastOAuthResult(payload);
	if (typeof window === 'undefined') return;
	if (window.opener && !window.opener.closed) {
		try {
			window.opener.postMessage(payload, window.location.origin);
		} catch {
			/* noop */
		}
	}
}

export function subscribeOAuthResults(
	onMessage: (payload: SocialOAuthMessage) => void,
): () => void {
	try {
		const ch = new BroadcastChannel(SOCIAL_OAUTH_CHANNEL);
		ch.onmessage = (ev: MessageEvent) => {
			if (isSocialOAuthMessage(ev.data)) onMessage(ev.data);
		};
		return () => ch.close();
	} catch {
		return () => {};
	}
}

export function dispatchOAuthDone(payload: SocialOAuthMessage): void {
	try {
		window.dispatchEvent(new CustomEvent(ODYSSEY_SOCIAL_OAUTH_EVENT, { detail: payload }));
	} catch {
		/* noop */
	}
}

export function clearOAuthPopupFlag(): void {
	try {
		window.sessionStorage.removeItem(OAUTH_POPUP_FLAG);
	} catch {
		/* noop */
	}
}

export function shouldSkipVideoLoader(): boolean {
	if (typeof window === 'undefined') return false;
	try {
		if (window.location.pathname.startsWith('/social/oauth-done')) return true;
		if (window.sessionStorage.getItem(OAUTH_POPUP_FLAG) === '1') return true;
		const p = new URLSearchParams(window.location.search);
		if (p.has('social_connected') || p.has('social_error')) return true;
	} catch {
		/* noop */
	}
	return false;
}
