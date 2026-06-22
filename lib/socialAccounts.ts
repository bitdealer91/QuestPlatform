import { pipeline } from '@/lib/redis';
import {
	type SocialAccounts,
	type SocialPlatform,
	isPlatformConnected,
	normalizeSocialUsername,
	socialAccountsRedisKey,
} from '@/lib/social';

export { isPlatformConnected };

function parseAccountsJson(raw: unknown): SocialAccounts {
	if (!raw) return {};
	try {
		const s = typeof raw === 'string' ? raw : String(raw);
		const j = JSON.parse(s) as SocialAccounts;
		return j && typeof j === 'object' ? j : {};
	} catch {
		return {};
	}
}

export async function getSocialAccounts(address: string): Promise<SocialAccounts> {
	const key = socialAccountsRedisKey(address);
	try {
		const res = await pipeline([['GET', key]]);
		const raw = (res as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		if (Array.isArray(raw)) {
			return parseAccountsJson(raw[0]?.result);
		}
		if (raw && Array.isArray(raw.result)) {
			return parseAccountsJson(raw.result[0]?.result);
		}
	} catch {
		/* noop */
	}
	return {};
}

export async function connectSocialAccount(
	address: string,
	platform: SocialPlatform,
	usernameRaw: string,
): Promise<{ ok: true; accounts: SocialAccounts } | { ok: false; error: string }> {
	const username = normalizeSocialUsername(platform, usernameRaw);
	if (!username) {
		return { ok: false, error: 'invalid_username' };
	}

	const existing = await getSocialAccounts(address);
	const now = Date.now();
	const next: SocialAccounts = { ...existing };
	if (platform === 'twitter') {
		next.twitter = username;
		next.twitterConnectedAt = now;
		delete next.twitterId;
	} else {
		next.discord = username;
		next.discordConnectedAt = now;
		delete next.discordId;
	}

	const key = socialAccountsRedisKey(address);
	await pipeline([['SET', key, JSON.stringify(next)]]);
	return { ok: true, accounts: next };
}

export async function disconnectSocialAccount(
	address: string,
	platform: SocialPlatform,
): Promise<SocialAccounts> {
	const existing = await getSocialAccounts(address);
	const next: SocialAccounts = { ...existing };
	if (platform === 'twitter') {
		delete next.twitter;
		delete next.twitterId;
		delete next.twitterConnectedAt;
	} else {
		delete next.discord;
		delete next.discordId;
		delete next.discordConnectedAt;
	}
	const key = socialAccountsRedisKey(address);
	await pipeline([['SET', key, JSON.stringify(next)]]);
	return next;
}
