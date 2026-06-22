'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { SocialAccounts, SocialPlatform } from '@/lib/social';
import { toast } from '@/components/ui/Toast';
import {
	clearOAuthPopupFlag,
	ODYSSEY_SOCIAL_OAUTH_EVENT,
	openSocialOAuthPopup,
	type SocialOAuthMessage,
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
	const childPollRef = useRef<ReturnType<typeof setInterval> | null>(null);

	const normalizedAddress = address?.toLowerCase();

	const refreshAccounts = useCallback(() => {
		if (!normalizedAddress) return;
		fetch(`/api/social/accounts?address=${normalizedAddress}`, { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => onUpdated((j?.accounts as SocialAccounts) || {}))
			.catch(() => {});
	}, [normalizedAddress, onUpdated]);

	const handleOAuthSuccess = useCallback(
		(_platform: SocialPlatform) => {
			clearOAuthPopupFlag();
			refreshAccounts();
			// Redis write can lag slightly after OAuth popup closes.
			let tries = 0;
			const id = setInterval(() => {
				tries += 1;
				refreshAccounts();
				if (tries >= 8) clearInterval(id);
			}, 500);
		},
		[refreshAccounts],
	);

	const handleOAuthError = useCallback((_error: string) => {
		clearOAuthPopupFlag();
	}, []);

	const clearChildPoll = useCallback(() => {
		if (childPollRef.current) {
			clearInterval(childPollRef.current);
			childPollRef.current = null;
		}
	}, []);

	const watchChildClose = useCallback(
		(child: Window) => {
			clearChildPoll();
			childPollRef.current = setInterval(() => {
				if (!child.closed) return;
				clearChildPoll();
				clearOAuthPopupFlag();
				refreshAccounts();
			}, 500);
		},
		[clearChildPoll, refreshAccounts],
	);

	useEffect(() => {
		fetch('/api/social/config', { cache: 'no-store' })
			.then((r) => r.json())
			.then((j) => setOauth({ twitter: Boolean(j?.twitter), discord: Boolean(j?.discord) }))
			.catch(() => setOauth({ twitter: false, discord: false }));
	}, []);

	// Full-page fallback when popup blocked
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

	useEffect(() => {
		const onOAuthDone = (ev: Event) => {
			const payload = (ev as CustomEvent<SocialOAuthMessage>).detail;
			if (!payload) return;
			clearChildPoll();
			if (payload.ok) handleOAuthSuccess(payload.platform);
			else handleOAuthError(payload.error);
		};
		window.addEventListener(ODYSSEY_SOCIAL_OAUTH_EVENT, onOAuthDone);
		return () => window.removeEventListener(ODYSSEY_SOCIAL_OAUTH_EVENT, onOAuthDone);
	}, [handleOAuthSuccess, handleOAuthError, clearChildPoll]);

	useEffect(() => () => clearChildPoll(), [clearChildPoll]);

	const startOAuth = useCallback(
		(platform: SocialPlatform) => {
			if (!normalizedAddress) {
				toast.info('Connect wallet', 'Link your wallet first.');
				return;
			}
			if (!oauth[platform]) {
				toast.error('Unavailable', `${platformLabel(platform)} login is not configured on this environment.`);
				return;
			}
			const url = `/api/social/oauth/${platform}?address=${encodeURIComponent(normalizedAddress)}`;

			const popup = openSocialOAuthPopup(url);
			if (!popup) {
				clearOAuthPopupFlag();
				window.location.href = url;
				return;
			}
			watchChildClose(popup);
		},
		[normalizedAddress, oauth, watchChildClose],
	);

	const disconnect = useCallback(
		async (platform: SocialPlatform) => {
			if (!normalizedAddress) return;
			setLoading(true);
			try {
				const res = await fetch('/api/social/connect', {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ address: normalizedAddress, platform, disconnect: true }),
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
		[normalizedAddress, onUpdated],
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
									disabled={loading || !normalizedAddress || !oauthReady}
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
