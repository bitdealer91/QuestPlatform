import { NextResponse } from 'next/server';
import { getSocialAccounts } from '@/lib/socialAccounts';

export const runtime = 'nodejs';

function isLowercaseHexAddress(a: string): boolean {
	return /^0x[0-9a-f]{40}$/.test(a);
}

export async function GET(req: Request) {
	const url = new URL(req.url);
	const address = String(url.searchParams.get('address') || '').trim().toLowerCase();
	if (!isLowercaseHexAddress(address)) {
		return NextResponse.json({ error: 'invalid_address' }, { status: 400 });
	}
	const accounts = await getSocialAccounts(address);
	return NextResponse.json({ address, accounts });
}
