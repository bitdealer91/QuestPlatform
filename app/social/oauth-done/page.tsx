'use client';

import { useEffect } from 'react';
import {
	SOCIAL_OAUTH_MESSAGE,
	type SocialOAuthMessage,
} from '@/lib/socialOAuthClient';
import type { SocialPlatform } from '@/lib/social';

function parsePlatform(v: string | null): SocialPlatform | null {
	if (v === 'twitter' || v === 'discord') return v;
	return null;
}

export default function SocialOAuthDonePage() {
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const platform = parsePlatform(params.get('connected'));
		const error = String(params.get('error') || '').trim();

		const payload: SocialOAuthMessage = platform
			? { type: SOCIAL_OAUTH_MESSAGE, ok: true, platform }
			: { type: SOCIAL_OAUTH_MESSAGE, ok: false, error: error || 'oauth_failed' };

		if (window.opener && !window.opener.closed) {
			try {
				window.opener.postMessage(payload, window.location.origin);
			} catch {
				/* noop */
			}
			window.close();
			return;
		}

		const root = new URL('/', window.location.origin);
		if (payload.ok) root.searchParams.set('social_connected', payload.platform);
		else root.searchParams.set('social_error', payload.error);
		window.location.replace(root.toString());
	}, []);

	return (
		<div className="min-h-screen flex items-center justify-center bg-[#0b0a14] px-4">
			<p className="text-sm text-white/70" style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}>
				Completing connection…
			</p>
		</div>
	);
}
