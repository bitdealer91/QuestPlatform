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

function notify(payload: SocialOAuthMessage): void {
	if (payload.ok) {
		toast.success('Account linked', `${platformLabel(payload.platform)} connected.`);
		return;
	}
	const cancelled = payload.error === 'access_denied' || payload.error === 'consent_denied';
	const network = payload.error === 'fetch failed' || payload.error === 'twitter_api_unreachable';
	toast.error(
		network ? 'X API unreachable' : cancelled ? 'Authorization cancelled' : 'Could not connect',
		network
			? 'Server could not reach X API. On local dev use VPN or test on Vercel.'
			: cancelled
				? 'You can try again when ready.'
				: 'Authorization failed. Please try again.',
	);
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
