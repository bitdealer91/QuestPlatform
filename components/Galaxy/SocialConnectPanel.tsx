'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { SocialAccounts, SocialPlatform } from '@/lib/social';
import { toast } from '@/components/ui/Toast';
import {
	clearOAuthPopupFlag,
	isSocialOAuthMessage,
	openSocialOAuthPopup,
} from '@/lib/socialOAuthClient';

type Props = {
	address?: string;
	accounts: SocialAccounts;
	requiredPlatform?: SocialPlatform;
	onUpdated: (accounts: SocialAccounts) => void;
	compact?: boolean;
};

type OAuthAvailability = { twitter: boolean; discord: boolean };

function platformLabel(p: SocialPlatform): string {
	return p === 'twitter' ? 'X' : 'Discord';
}

export default function SocialConnectPanel({
	address,
	accounts,
	requiredPlatform,
	onUpdated,
	compact = false,
}: Props) {
	const [loading, setLoading] = useState(false);
	const [oauth, setOauth] = useState<OAuthAvailability>({ twitter: false, discord: false });
	const popupPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const refreshAccounts = useCallback(() => {
		if (!address) return;
		fetch(`/api/social/accounts?address=${address}`, { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => onUpdated((j?.accounts as SocialAccounts) || {}))
			.catch(() => {});
	}, [address, onUpdated]);

	const handleOAuthSuccess = useCallback(
		(platform: SocialPlatform) => {
			clearOAuthPopupFlag();
			toast.success('Account linked', `${platformLabel(platform)} connected.`);
			refreshAccounts();
		},
		[refreshAccounts],
	);

	const handleOAuthError = useCallback((error: string) => {
		clearOAuthPopupFlag();
		const cancelled = error === 'access_denied' || error === 'consent_denied';
		toast.error(
			cancelled ? 'Authorization cancelled' : 'Could not connect',
			cancelled ? 'You can try again when ready.' : 'Authorization failed. Please try again.',
		);
	}, []);

	const clearPopupPoll = useCallback(() => {
		if (popupPollRef.current) {
			clearInterval(popupPollRef.current);
			popupPollRef.current = null;
		}
	}, []);

	useEffect(() => {
		fetch('/api/social/config', { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => setOauth({ twitter: Boolean(j?.twitter), discord: Boolean(j?.discord) }))
			.catch(() => setOauth({ twitter: false, discord: false }));
	}, []);

	// Full-page fallback when popup is blocked (redirect lands on /?social_connected=…)
	useEffect(() => {
		if (typeof window === 'undefined') return;
		const params = new URLSearchParams(window.location.search);
		const connected = params.get('social_connected');
		const err = params.get('social_error');
		if (connected === 'twitter' || connected === 'discord') {
			handleOAuthSuccess(connected);
			params.delete('social_connected');
			params.delete('social_error');
			const q = params.toString();
			window.history.replaceState({}, '', q ? `${window.location.pathname}?${q}` : window.location.pathname);
		} else if (err) {
			handleOAuthError(err);
			params.delete('social_error');
			const q = params.toString();
			window.history.replaceState({}, '', q ? `${window.location.pathname}?${q}` : window.location.pathname);
		}
	}, [handleOAuthSuccess, handleOAuthError]);

	// Popup OAuth: opener receives result without reloading this page
	useEffect(() => {
		const onMessage = (ev: MessageEvent) => {
			if (ev.origin !== window.location.origin) return;
			if (!isSocialOAuthMessage(ev.data)) return;
			clearPopupPoll();
			if (ev.data.ok) handleOAuthSuccess(ev.data.platform);
			else handleOAuthError(ev.data.error);
		};
		window.addEventListener('message', onMessage);
		return () => window.removeEventListener('message', onMessage);
	}, [handleOAuthSuccess, handleOAuthError, clearPopupPoll]);

	useEffect(() => () => clearPopupPoll(), [clearPopupPoll]);

	const startOAuth = useCallback(
		(platform: SocialPlatform) => {
			if (!address) {
				toast.info('Connect wallet', 'Link your wallet first.');
				return;
			}
			if (!oauth[platform]) {
				toast.error('Unavailable', `${platformLabel(platform)} login is not configured on this environment.`);
				return;
			}
			const url = `/api/social/oauth/${platform}?address=${encodeURIComponent(address)}`;
			const popup = openSocialOAuthPopup(url);
			if (!popup) {
				clearOAuthPopupFlag();
				window.location.href = url;
				return;
			}
			clearPopupPoll();
			popupPollRef.current = setInterval(() => {
				if (!popup.closed) return;
				clearPopupPoll();
				clearOAuthPopupFlag();
			}, 400);
		},
		[address, oauth, clearPopupPoll],
	);

	const disconnect = useCallback(
		async (platform: SocialPlatform) => {
			if (!address) return;
			setLoading(true);
			try {
				const res = await fetch('/api/social/connect', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ address, platform, disconnect: true }),
				});
				const json = await res.json().catch(() => null);
				if (!res.ok || !json?.accounts) {
					toast.error('Could not disconnect', String(json?.error || 'failed'));
					return;
				}
				onUpdated(json.accounts as SocialAccounts);
				toast.success('Disconnected', `${platformLabel(platform)} unlinked.`);
			} finally {
				setLoading(false);
			}
		},
		[address, onUpdated],
	);

	const platforms: SocialPlatform[] =
		requiredPlatform != null ? [requiredPlatform] : ['twitter', 'discord'];

	return (
		<div
			className={clsx(
				'rounded-[var(--radius-lg)] border border-white/10 bg-[color:var(--odyssey-task-surface)]',
				compact ? 'p-3 space-y-2' : 'p-4 space-y-3',
			)}
		>
			<div className={clsx(compact ? 'text-xs' : 'text-sm', 'text-[color:var(--odyssey-task-muted)]')}>
				Connect your X or Discord account to complete social quests.
			</div>
			{platforms.map((platform) => {
				const connected = platform === 'twitter' ? accounts.twitter : accounts.discord;
				const oauthReady = oauth[platform];
				return (
					<div
						key={platform}
						className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
					>
						<div className="min-w-0">
							<div className="text-sm font-medium text-white">{platformLabel(platform)}</div>
							<div className="text-xs text-[color:var(--odyssey-task-muted)] truncate">
								{connected ? `@${connected}` : 'Not connected'}
							</div>
						</div>
						<div className="flex flex-wrap items-center gap-2">
							{connected ? (
								<>
									<span className="text-xs text-[color:var(--odyssey-task-active)]">Connected</span>
									<button
										type="button"
										disabled={loading}
										onClick={() => disconnect(platform)}
										className="text-xs text-white/70 underline underline-offset-2 hover:text-white"
									>
										Disconnect
									</button>
								</>
							) : (
								<button
									type="button"
									disabled={loading || !address || !oauthReady}
									onClick={() => startOAuth(platform)}
									className="h-8 rounded-full border border-[#78a3c8] px-3 text-xs text-[#78a3c8] disabled:opacity-40"
									title={oauthReady ? undefined : 'OAuth credentials not configured'}
								>
									Connect {platformLabel(platform)}
								</button>
							)}
						</div>
					</div>
				);
			})}
		</div>
	);
}
