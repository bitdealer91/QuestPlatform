import { createHash, randomBytes } from 'node:crypto';
import type { SocialPlatform } from '@/lib/social';
import { oauthCallbackUrl } from '@/lib/socialOAuthConfig';

export function createPkcePair(): { verifier: string; challenge: string } {
	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	return { verifier, challenge };
}

export function buildDiscordAuthorizeUrl(opts: {
	clientId: string;
	redirectUri: string;
	state: string;
}): string {
	const params = new URLSearchParams({
		client_id: opts.clientId,
		redirect_uri: opts.redirectUri,
		response_type: 'code',
		scope: 'identify',
		state: opts.state,
	});
	return `https://discord.com/api/oauth2/authorize?${params}`;
}

export function buildTwitterAuthorizeUrl(opts: {
	clientId: string;
	redirectUri: string;
	state: string;
	codeChallenge: string;
}): string {
	const params = new URLSearchParams({
		response_type: 'code',
		client_id: opts.clientId,
		redirect_uri: opts.redirectUri,
		scope: 'users.read tweet.read',
		state: opts.state,
		code_challenge: opts.codeChallenge,
		code_challenge_method: 'S256',
	});
	return `https://x.com/i/oauth2/authorize?${params}`;
}

export async function exchangeDiscordCode(opts: {
	code: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
}): Promise<{ id: string; username: string }> {
	const body = new URLSearchParams({
		client_id: opts.clientId,
		client_secret: opts.clientSecret,
		grant_type: 'authorization_code',
		code: opts.code,
		redirect_uri: opts.redirectUri,
	});
	const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body,
	});
	if (!tokenRes.ok) {
		throw new Error(`discord_token_${tokenRes.status}`);
	}
	const tokenJson = (await tokenRes.json()) as { access_token?: string };
	const accessToken = tokenJson.access_token;
	if (!accessToken) throw new Error('discord_no_token');

	const userRes = await fetch('https://discord.com/api/users/@me', {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!userRes.ok) throw new Error(`discord_user_${userRes.status}`);
	const user = (await userRes.json()) as { id?: string; username?: string; global_name?: string };
	const username = String(user.username || user.global_name || '').trim();
	if (!user.id || !username) throw new Error('discord_bad_user');
	return { id: user.id, username };
}

const X_TOKEN_URL = 'https://api.x.com/2/oauth2/token';
const X_USERS_ME_URL = 'https://api.x.com/2/users/me?user.fields=username';

export async function exchangeTwitterCode(opts: {
	code: string;
	clientId: string;
	clientSecret: string;
	redirectUri: string;
	codeVerifier: string;
}): Promise<{ id: string; username: string }> {
	const basic = Buffer.from(`${opts.clientId}:${opts.clientSecret}`).toString('base64');
	const body = new URLSearchParams({
		code: opts.code,
		grant_type: 'authorization_code',
		client_id: opts.clientId,
		redirect_uri: opts.redirectUri,
		code_verifier: opts.codeVerifier,
	});
	const tokenRes = await fetch(X_TOKEN_URL, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/x-www-form-urlencoded',
			Authorization: `Basic ${basic}`,
		},
		body,
	});
	if (!tokenRes.ok) {
		throw new Error(`twitter_token_${tokenRes.status}`);
	}
	const tokenJson = (await tokenRes.json()) as { access_token?: string; scope?: string };
	const accessToken = tokenJson.access_token;
	if (!accessToken) throw new Error('twitter_no_token');

	const userRes = await fetch(X_USERS_ME_URL, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!userRes.ok) {
		throw new Error(`twitter_user_${userRes.status}`);
	}
	const userJson = (await userRes.json()) as { data?: { id?: string; username?: string } };
	const id = userJson.data?.id;
	const username = userJson.data?.username;
	if (!id || !username) throw new Error('twitter_bad_user');
	return { id, username };
}

export function platformFromRouteParam(p: string): SocialPlatform | null {
	const s = p.trim().toLowerCase();
	if (s === 'twitter' || s === 'x') return 'twitter';
	if (s === 'discord') return 'discord';
	return null;
}

export { oauthCallbackUrl };
