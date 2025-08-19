import { z } from "zod";

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

export async function getJson<T>(url: string, schema: z.ZodSchema<T>, opts?: { signal?: AbortSignal; retries?: number }) {
	const { signal, retries = 2 } = opts || {};
	let attempt = 0;
	let lastErr: unknown;
	while (attempt <= retries) {
		try {
			const ctrl = new AbortController();
			const res = await fetch(url, { signal: signal || ctrl.signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			return schema.parse(json);
		} catch (e) {
			lastErr = e;
			if (attempt === retries) break;
			await sleep(2 ** attempt * 250);
			attempt++;
		}
	}
	throw lastErr;
}

export async function postJson<T>(url: string, body: unknown, schema: z.ZodSchema<T>, opts?: { signal?: AbortSignal; retries?: number }) {
	const { signal, retries = 1 } = opts || {};
	let attempt = 0;
	let lastErr: unknown;
	while (attempt <= retries) {
		try {
			const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), signal });
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			return schema.parse(json);
		} catch (e) {
			lastErr = e;
			if (attempt === retries) break;
			await sleep(2 ** attempt * 300);
			attempt++;
		}
	}
	throw lastErr;
}
