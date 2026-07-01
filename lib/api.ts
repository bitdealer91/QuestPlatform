import { z } from "zod";

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }

function isAbortError(e: unknown): boolean {
	return e instanceof DOMException && e.name === "AbortError";
}

function linkAbortSignals(target: AbortController, ...sources: Array<AbortSignal | undefined>) {
	for (const source of sources) {
		if (!source) continue;
		if (source.aborted) {
			target.abort();
			return;
		}
		source.addEventListener("abort", () => target.abort(), { once: true });
	}
}

export async function getJson<T>(url: string, schema: z.ZodSchema<T>, opts?: { signal?: AbortSignal; retries?: number; timeoutMs?: number }) {
	const { signal, retries = 1, timeoutMs = 2500 } = opts || {};
	let attempt = 0;
	let lastErr: unknown;
	while (attempt <= retries) {
		if (signal?.aborted) break;
		try {
			const ctrl = new AbortController();
			const t = setTimeout(() => ctrl.abort(), timeoutMs);
			linkAbortSignals(ctrl, signal);
			const res = await fetch(url, { signal: ctrl.signal });
			clearTimeout(t);
			if (!res.ok) throw new Error(`HTTP ${res.status}`);
			const json = await res.json();
			return schema.parse(json);
		} catch (e) {
			if (signal?.aborted) break;
			lastErr = isAbortError(e)
				? new Error("Request timed out. Please try again.")
				: e;
			if (attempt === retries) break;
			await sleep(2 ** attempt * 250);
			attempt++;
		}
	}
	if (signal?.aborted) {
		throw new DOMException("Aborted", "AbortError");
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
