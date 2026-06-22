export type SocialPlatform = 'twitter' | 'discord';

export type SocialAction =
	| 'twitter_follow'
	| 'twitter_like'
	| 'twitter_repost'
	| 'discord_join';

export type SocialAccounts = {
	twitter?: string;
	twitterId?: string;
	twitterConnectedAt?: number;
	discord?: string;
	discordId?: string;
	discordConnectedAt?: number;
};

const ACTION_PLATFORM: Record<SocialAction, SocialPlatform> = {
	twitter_follow: 'twitter',
	twitter_like: 'twitter',
	twitter_repost: 'twitter',
	discord_join: 'discord',
};

export const SOCIAL_ACTION_LABELS: Record<SocialAction, string> = {
	twitter_follow: 'Follow on X',
	twitter_like: 'Like on X',
	twitter_repost: 'Repost on X',
	discord_join: 'Join Discord server',
};

export function isSocialTask(task: {
	type?: unknown;
	verify_method?: unknown;
} | null | undefined): boolean {
	if (!task) return false;
	const type = String(task.type || '').trim();
	const method = String(task.verify_method || '').trim();
	return type === 'social' || method === 'social';
}

export function parseSocialAction(vp: Record<string, unknown> | undefined): SocialAction | null {
	const raw = String(vp?.social_action || vp?.action || '').trim();
	if (raw in ACTION_PLATFORM) return raw as SocialAction;
	return null;
}

export function platformForAction(action: SocialAction): SocialPlatform {
	return ACTION_PLATFORM[action];
}

export function isPlatformConnected(accounts: SocialAccounts, platform: SocialPlatform): boolean {
	if (platform === 'twitter') return Boolean(accounts.twitter);
	return Boolean(accounts.discord);
}

export function platformLabel(platform: SocialPlatform): string {
	return platform === 'twitter' ? 'X' : 'Discord';
}

export function normalizeSocialUsername(platform: SocialPlatform, raw: string): string | null {
	const s = String(raw || '').trim().replace(/^@+/, '');
	if (!s) return null;
	if (platform === 'twitter') {
		if (!/^[A-Za-z0-9_]{1,15}$/.test(s)) return null;
		return s;
	}
	// Discord: username or legacy name#0000 simplified
	if (!/^[a-z0-9._]{2,32}$/i.test(s.replace(/#\d{4}$/, ''))) return null;
	return s.replace(/#\d{4}$/, '');
}

export function socialAccountsRedisKey(address: string): string {
	return `user:social:${address.toLowerCase()}`;
}
