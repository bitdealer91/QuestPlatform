import { NextResponse } from 'next/server';
import { isOAuthConfigured } from '@/lib/socialOAuthConfig';

export const runtime = 'nodejs';

export async function GET() {
	return NextResponse.json({
		twitter: isOAuthConfigured('twitter'),
		discord: isOAuthConfigured('discord'),
	});
}
