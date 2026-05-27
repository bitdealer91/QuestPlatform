import { randomBytes } from 'node:crypto';
import { pipeline } from '@/lib/redis';
import type { SocialPlatform } from '@/lib/social';

const TTL_SEC = 600;

export type OAuthStatePayload = {
	address: string;
	platform: SocialPlatform;
	codeVerifier?: string;
};

function stateKey(state: string): string {
	return `oauth_state:${state}`;
}

export function createOAuthState(): string {
	return randomBytes(24).toString('base64url');
}

export async function saveOAuthState(
	state: string,
	payload: OAuthStatePayload,
): Promise<void> {
	await pipeline([['SET', stateKey(state), JSON.stringify(payload), 'EX', String(TTL_SEC)]]);
}

export async function consumeOAuthState(state: string): Promise<OAuthStatePayload | null> {
	const key = stateKey(state);
	try {
		const res = await pipeline([['GET', key], ['DEL', key]]);
		const raw = (res as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		let v: unknown;
		if (Array.isArray(raw)) v = raw[0]?.result;
		else if (raw && Array.isArray(raw.result)) v = raw.result[0]?.result;
		if (!v) return null;
		const s = typeof v === 'string' ? v : String(v);
		return JSON.parse(s) as OAuthStatePayload;
	} catch {
		return null;
	}
}
