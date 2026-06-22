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
} from '@/lib/social';

export type SocialVerifyPayload = {
	completed: boolean;
	error?: string;
	message?: string;
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

	const xpValue = task.xp;
	const xp = typeof xpValue === 'number' ? xpValue : 0;
	writeSuccess(address, taskId).catch(() => {});
	await persistSuccess(address, taskId, xp);

	return {
		completed: true,
		socialAction: action,
		platform,
		...(wantDebug ? { debug: { accounts } } : {}),
	};
}

export { isSocialTask };
