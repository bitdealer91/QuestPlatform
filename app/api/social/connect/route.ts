import { NextResponse } from 'next/server';
import { connectSocialAccount, disconnectSocialAccount } from '@/lib/socialAccounts';
import type { SocialPlatform } from '@/lib/social';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean {
	return /^0x[0-9a-f]{40}$/.test(a);
}

function parsePlatform(v: unknown): SocialPlatform | null {
	const s = String(v || '').trim().toLowerCase();
	if (s === 'twitter' || s === 'x') return 'twitter';
	if (s === 'discord') return 'discord';
	return null;
}

export async function POST(req: Request) {
	try {
		const body = await req.json().catch(() => ({}));
		const address = String(body.address || '').trim().toLowerCase();
		const platform = parsePlatform(body.platform);
		const username = String(body.username || body.handle || '').trim();
		const disconnect = Boolean(body.disconnect);

		if (!isLowercaseHexAddress(address) || !platform) {
			return NextResponse.json({ error: 'bad_request' }, { status: 400 });
		}

		if (disconnect) {
			const accounts = await disconnectSocialAccount(address, platform);
			return NextResponse.json({ ok: true, accounts });
		}

		if (process.env.ALLOW_MANUAL_SOCIAL_CONNECT !== '1') {
			return NextResponse.json(
				{ error: 'oauth_required', message: 'Use Connect to sign in with X or Discord.' },
				{ status: 403 },
			);
		}

		if (!username) {
			return NextResponse.json({ error: 'username_required' }, { status: 400 });
		}

		const result = await connectSocialAccount(address, platform, username);
		if (!result.ok) {
			return NextResponse.json({ error: result.error }, { status: 400 });
		}
		return NextResponse.json({ ok: true, accounts: result.accounts });
	} catch {
		return NextResponse.json({ error: 'failed' }, { status: 500 });
	}
}
