'use client';

import { useEffect, useRef } from 'react';
import type { SocialPlatform } from '@/lib/social';
import { toast } from '@/components/ui/Toast';
import {
	clearOAuthPopupFlag,
	dispatchOAuthDone,
	isSocialOAuthMessage,
	subscribeOAuthResults,
	type SocialOAuthMessage,
} from '@/lib/socialOAuthClient';

function platformLabel(p: SocialPlatform): string {
	return p === 'twitter' ? 'X' : 'Discord';
}

function oauthErrorMessage(error: string): { title: string; body: string } {
	if (error === 'twitter_user_403') {
		return {
			title: 'X profile access denied',
			body: 'X denied reading your profile (403). Re-connect after app has Read permission and users.read + tweet.read scopes.',
		};
	}
	if (error === 'fetch failed' || error === 'twitter_api_unreachable') {
		return {
			title: 'X API unreachable',
			body: 'Server could not reach X API. On local dev use VPN or test on Vercel.',
		};
	}
	const cancelled = error === 'access_denied' || error === 'consent_denied';
	if (cancelled) {
		return { title: 'Authorization cancelled', body: 'You can try again when ready.' };
	}
	return { title: 'Could not connect', body: 'Authorization failed. Please try again.' };
}

function notify(payload: SocialOAuthMessage): void {
	if (payload.ok) {
		toast.success('Account linked', `${platformLabel(payload.platform)} connected.`);
		return;
	}
	const { title, body } = oauthErrorMessage(payload.error);
	toast.error(title, body);
}

/** Relays oauth-done (tab/popup) → main page via BroadcastChannel + postMessage. */
export default function SocialOAuthBridge() {
	const handledRef = useRef('');

	const handlePayload = (payload: SocialOAuthMessage) => {
		const key = JSON.stringify(payload);
		if (handledRef.current === key) return;
		handledRef.current = key;
		clearOAuthPopupFlag();
		notify(payload);
		dispatchOAuthDone(payload);
	};

	useEffect(() => {
		const unsub = subscribeOAuthResults(handlePayload);

		const onMessage = (ev: MessageEvent) => {
			if (ev.origin !== window.location.origin) return;
			if (!isSocialOAuthMessage(ev.data)) return;
			handlePayload(ev.data);
		};
		window.addEventListener('message', onMessage);

		return () => {
			unsub();
			window.removeEventListener('message', onMessage);
		};
	}, []);

	return null;
}
