'use client';

import { useEffect, useState } from 'react';
import {
	deliverOAuthResult,
	SOCIAL_OAUTH_MESSAGE,
	type SocialOAuthMessage,
} from '@/lib/socialOAuthClient';
import type { SocialPlatform } from '@/lib/social';

function parsePlatform(v: string | null): SocialPlatform | null {
	if (v === 'twitter' || v === 'discord') return v;
	return null;
}

function tryCloseWindow(): void {
	try {
		window.close();
	} catch {
		/* noop */
	}
}

export default function SocialOAuthDonePage() {
	const [stuckOpen, setStuckOpen] = useState(false);
	const [payload, setPayload] = useState<SocialOAuthMessage | null>(null);

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const platform = parsePlatform(params.get('connected'));
		const error = String(params.get('error') || '').trim();

		const result: SocialOAuthMessage = platform
			? { type: SOCIAL_OAUTH_MESSAGE, ok: true, platform }
			: { type: SOCIAL_OAUTH_MESSAGE, ok: false, error: error || 'oauth_failed' };

		setPayload(result);
		deliverOAuthResult(result);

		const isPopup = Boolean(window.opener && !window.opener.closed);
		let attempt = 0;

		const scheduleClose = () => {
			tryCloseWindow();
			if (window.closed) return;
			attempt += 1;
			if (attempt < 6) {
				window.setTimeout(scheduleClose, 120 * attempt);
				return;
			}
			if (isPopup) {
				setStuckOpen(true);
				return;
			}
			const root = new URL('/', window.location.origin);
			if (result.ok) root.searchParams.set('social_connected', result.platform);
			else root.searchParams.set('social_error', result.error);
			window.location.replace(root.toString());
		};

		scheduleClose();
	}, []);

	const label = payload?.ok
		? payload.platform === 'twitter'
			? 'X'
			: 'Discord'
		: null;

	return (
		<div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-[#0b0a14] px-4 text-center">
			<p
				className="text-sm text-white/70"
				style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
			>
				{stuckOpen
					? payload?.ok
						? `${label} connected. You can close this window.`
						: 'Authorization finished. You can close this window.'
					: 'Completing connection…'}
			</p>
			{stuckOpen ? (
				<button
					type="button"
					onClick={tryCloseWindow}
					className="text-xs text-[#78a3c8] underline underline-offset-2"
				>
					Close window
				</button>
			) : null}
		</div>
	);
}
