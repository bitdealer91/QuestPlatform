import { pipeline } from '@/lib/redis';
import { writeFailure, writeSuccess } from '@/lib/ledger';
import {
	isPlatformConnected,
	getSocialAccounts,
} from '@/lib/socialAccounts';
import {
	type SocialAction,
	isSocialTask,
	parseSocialAction,
	platformForAction,
	socialAttemptRedisKey,
} from '@/lib/social';

async function readAttemptCount(key: string): Promise<number> {
	try {
		const res = await pipeline([['GET', key]]);
		const raw = (res as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		let v: unknown;
		if (Array.isArray(raw)) v = raw[0]?.result;
		else if (raw && Array.isArray(raw.result)) v = raw.result[0]?.result;
		const n = Number(v ?? 0);
		return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
	} catch {
		return 0;
	}
}

async function incrementAttempt(key: string): Promise<number> {
	try {
		const res = await pipeline([['INCR', key]]);
		const raw = (res as unknown) as { result?: Array<{ result?: unknown }> } | Array<{ result?: unknown }> | null;
		let v: unknown;
		if (Array.isArray(raw)) v = raw[0]?.result;
		else if (raw && Array.isArray(raw.result)) v = raw.result[0]?.result;
		const n = Number(v ?? 1);
		return Number.isFinite(n) ? n : 1;
	} catch {
		return 1;
	}
}

async function clearAttempt(key: string): Promise<void> {
	try {
		await pipeline([['DEL', key]]);
	} catch {
		/* noop */
	}
}

export type SocialVerifyPayload = {
	completed: boolean;
	error?: string;
	message?: string;
	attempt?: number;
	socialAction?: SocialAction;
	platform?: string;
	debug?: Record<string, unknown>;
};

export async function verifySocialTask(opts: {
	address: string;
	taskId: string;
	task: Record<string, unknown>;
	persistSuccess: (address: string, taskId: string, xp: number) => Promise<void>;
	wantDebug?: boolean;
}): Promise<SocialVerifyPayload> {
	const { address, taskId, task, persistSuccess, wantDebug } = opts;
	const vp = (task.verify_params || {}) as Record<string, unknown>;
	const action = parseSocialAction(vp);

	if (!action) {
		return { completed: false, error: 'bad_social_params', message: 'Task is missing social_action in verify_params.' };
	}

	const platform = platformForAction(action);
	const accounts = await getSocialAccounts(address);

	if (!isPlatformConnected(accounts, platform)) {
		writeFailure(address, taskId, 'social_not_linked').catch(() => {});
		return {
			completed: false,
			error: 'social_not_linked',
			platform,
			socialAction: action,
			message:
				platform === 'twitter'
					? 'Connect your X (Twitter) account before verifying.'
					: 'Connect your Discord account before verifying.',
		};
	}

	const attemptKey = socialAttemptRedisKey(address, taskId);
	const prior = await readAttemptCount(attemptKey);

	const genericFailMessage =
		'We could not verify this action yet. Complete the task and ensure your account is connected.';

	// Social: first check does not complete (no external Galxe-style API)
	if (prior < 1) {
		await incrementAttempt(attemptKey);
		writeFailure(address, taskId, 'not_completed').catch(() => {});
		return {
			completed: false,
			error: 'not_completed',
			socialAction: action,
			platform,
			message: genericFailMessage,
			...(wantDebug ? { debug: { socialAttempt: 1, accounts } } : {}),
		};
	}

	const xpValue = task.xp;
	const xp = typeof xpValue === 'number' ? xpValue : 0;
	writeSuccess(address, taskId).catch(() => {});
	await persistSuccess(address, taskId, xp);
	await clearAttempt(attemptKey);

	return {
		completed: true,
		attempt: prior + 1,
		socialAction: action,
		platform,
		...(wantDebug ? { debug: { socialAttempt: prior + 1, accounts } } : {}),
	};
}

export { isSocialTask };
