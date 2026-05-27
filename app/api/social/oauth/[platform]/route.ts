import { NextResponse } from 'next/server';
import {
	buildDiscordAuthorizeUrl,
	buildTwitterAuthorizeUrl,
	createPkcePair,
	platformFromRouteParam,
} from '@/lib/socialOAuthProviders';
import { isOAuthConfigured, oauthCallbackUrl } from '@/lib/socialOAuthConfig';
import { createOAuthState, saveOAuthState } from '@/lib/socialOAuthState';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean {
	return /^0x[0-9a-f]{40}$/.test(a);
}

export async function GET(
	req: Request,
	{ params }: { params: { platform: string } },
) {
	const platform = platformFromRouteParam(params.platform);
	if (!platform) {
		return NextResponse.json({ error: 'invalid_platform' }, { status: 400 });
	}

	const url = new URL(req.url);
	const address = String(url.searchParams.get('address') || '').trim().toLowerCase();
	if (!isLowercaseHexAddress(address)) {
		return NextResponse.json({ error: 'invalid_address' }, { status: 400 });
	}

	if (!isOAuthConfigured(platform)) {
		return NextResponse.json(
			{
				error: 'oauth_not_configured',
				platform,
				hint: `Set ${platform === 'discord' ? 'DISCORD_CLIENT_ID and DISCORD_CLIENT_SECRET' : 'TWITTER_CLIENT_ID and TWITTER_CLIENT_SECRET'} plus NEXT_PUBLIC_APP_URL`,
			},
			{ status: 503 },
		);
	}

	const state = createOAuthState();
	const redirectUri = oauthCallbackUrl(platform, req);

	if (platform === 'discord') {
		const clientId = process.env.DISCORD_CLIENT_ID!;
		await saveOAuthState(state, { address, platform });
		const authUrl = buildDiscordAuthorizeUrl({ clientId, redirectUri, state });
		return NextResponse.redirect(authUrl);
	}

	const clientId = process.env.TWITTER_CLIENT_ID!;
	const { verifier, challenge } = createPkcePair();
	await saveOAuthState(state, { address, platform, codeVerifier: verifier });
	const authUrl = buildTwitterAuthorizeUrl({
		clientId,
		redirectUri,
		state,
		codeChallenge: challenge,
	});
	return NextResponse.redirect(authUrl);
}
