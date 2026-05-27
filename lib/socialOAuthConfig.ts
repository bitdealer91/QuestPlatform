import type { SocialPlatform } from '@/lib/social';

export function appOrigin(req?: Request): string {
	const fromEnv = String(process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || '').trim();
	if (fromEnv) return fromEnv.replace(/\/$/, '');
	if (req) {
		const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
		const proto = req.headers.get('x-forwarded-proto') || 'https';
		if (host) return `${proto}://${host}`;
	}
	return 'http://localhost:3000';
}

export function isOAuthConfigured(platform: SocialPlatform): boolean {
	if (platform === 'discord') {
		return Boolean(process.env.DISCORD_CLIENT_ID && process.env.DISCORD_CLIENT_SECRET);
	}
	return Boolean(process.env.TWITTER_CLIENT_ID && process.env.TWITTER_CLIENT_SECRET);
}

export function oauthCallbackUrl(platform: SocialPlatform, req?: Request): string {
	return `${appOrigin(req)}/api/social/callback/${platform}`;
}
