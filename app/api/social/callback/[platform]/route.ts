import { NextResponse } from 'next/server';
import {
	exchangeDiscordCode,
	exchangeTwitterCode,
	platformFromRouteParam,
} from '@/lib/socialOAuthProviders';
import { appOrigin, oauthCallbackUrl } from '@/lib/socialOAuthConfig';
import { oauthDoneUrl } from '@/lib/socialOAuthClient';
import { consumeOAuthState } from '@/lib/socialOAuthState';
import { getSocialAccounts } from '@/lib/socialAccounts';
import { pipeline } from '@/lib/redis';
import { socialAccountsRedisKey } from '@/lib/social';

export const runtime = 'nodejs';

async function saveLinkedAccount(
	address: string,
	platform: 'twitter' | 'discord',
	username: string,
	providerId: string,
): Promise<void> {
	const existing = await getSocialAccounts(address);
	const now = Date.now();
	const next = { ...existing };
	if (platform === 'twitter') {
		next.twitter = username;
		next.twitterId = providerId;
		next.twitterConnectedAt = now;
	} else {
		next.discord = username;
		next.discordId = providerId;
		next.discordConnectedAt = now;
	}
	await pipeline([['SET', socialAccountsRedisKey(address), JSON.stringify(next)]]);
}

export async function GET(
	req: Request,
	{ params }: { params: { platform: string } },
) {
	const platform = platformFromRouteParam(params.platform);
	const origin = appOrigin(req);
	const fail = (reason: string) =>
		NextResponse.redirect(oauthDoneUrl(origin, { error: reason }));

	if (!platform) return fail('invalid_platform');

	const url = new URL(req.url);
	const code = String(url.searchParams.get('code') || '').trim();
	const state = String(url.searchParams.get('state') || '').trim();
	const oauthError = url.searchParams.get('error');

	if (oauthError) return fail(String(oauthError));
	if (!code || !state) return fail('missing_code');

	const payload = await consumeOAuthState(state);
	if (!payload || payload.platform !== platform) return fail('invalid_state');

	try {
		const redirectUri = oauthCallbackUrl(platform, req);
		if (platform === 'discord') {
			const profile = await exchangeDiscordCode({
				code,
				clientId: process.env.DISCORD_CLIENT_ID!,
				clientSecret: process.env.DISCORD_CLIENT_SECRET!,
				redirectUri,
			});
			await saveLinkedAccount(payload.address, 'discord', profile.username, profile.id);
		} else {
			if (!payload.codeVerifier) return fail('missing_verifier');
			const profile = await exchangeTwitterCode({
				code,
				clientId: process.env.TWITTER_CLIENT_ID!,
				clientSecret: process.env.TWITTER_CLIENT_SECRET!,
				redirectUri,
				codeVerifier: payload.codeVerifier,
			});
			await saveLinkedAccount(payload.address, 'twitter', profile.username, profile.id);
		}
		return NextResponse.redirect(oauthDoneUrl(origin, { connected: platform }));
	} catch (e) {
		const msg = e instanceof Error ? e.message : 'oauth_failed';
		return fail(msg);
	}
}
