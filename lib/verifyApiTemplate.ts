const PROPHECY_ELIGIBILITY_DEFAULT = 'https://prophecy.social/api/airdrop/eligibility';

function envValue(key: string): string {
	if (key === 'PROPHECY_ELIGIBILITY_URL') {
		return String(process.env.PROPHECY_ELIGIBILITY_URL || PROPHECY_ELIGIBILITY_DEFAULT).trim();
	}
	return String(process.env[key] ?? '').trim();
}

export function resolveVerifyString(str: string, addrRaw: string, addrLower: string): string {
	return str
		.replace(/:userAddress/g, addrRaw || addrLower)
		.replace(/:walletAddress/g, addrRaw || addrLower)
		.replace(/:addressLower/g, addrLower)
		.replace(/:address/g, addrRaw || addrLower)
		.replace(/\benv:([A-Z0-9_]+)\b/g, (_, key: string) => envValue(key));
}

export function resolveVerifyTemplate(
	value: unknown,
	addrRaw: string,
	addrLower: string,
): unknown {
	if (typeof value === 'string') return resolveVerifyString(value, addrRaw, addrLower);
	if (Array.isArray(value)) {
		return value.map((v) => resolveVerifyTemplate(v, addrRaw, addrLower));
	}
	if (value && typeof value === 'object') {
		const out: Record<string, unknown> = {};
		for (const [k, v] of Object.entries(value)) {
			out[k] = resolveVerifyTemplate(v, addrRaw, addrLower);
		}
		return out;
	}
	return value;
}
