import { ODYSSEY_BRIDGES, ODYSSEY_PATH, ODYSSEY_WEEKS } from '@/lib/odysseyLayout';
import { ODYSSEY_MOBILE_ISLAND_LAYERS } from '@/lib/odysseyMobileIslands';

/** Minimum loader visibility (ms). */
export const LOADER_MIN_SHOW_MS = 4000;

const DESKTOP_MAP_ASSETS: string[] = [
	'/assets/background.png',
	'/assets/background.mp4',
	...Object.values(ODYSSEY_WEEKS).map((w) => w.image),
	...ODYSSEY_BRIDGES.map((b) => b.src),
	ODYSSEY_PATH.src,
	'/assets/mascot.png',
	'/assets/bear.webm',
];

const MOBILE_MAP_ASSETS: string[] = [
	'/assets/background.png',
	...Object.values(ODYSSEY_MOBILE_ISLAND_LAYERS).flatMap((layers) => layers.map((l) => l.src)),
	'/assets/mascot.png',
	'/assets/bear.webm',
];

function unique(urls: string[]): string[] {
	return [...new Set(urls)];
}

export function getCriticalLoaderAssets(isMobile: boolean): string[] {
	return unique(isMobile ? MOBILE_MAP_ASSETS : DESKTOP_MAP_ASSETS);
}

function isVideoSrc(src: string): boolean {
	return /\.(mp4|webm|mov)(\?|$)/i.test(src);
}

function warmImage(src: string): Promise<void> {
	return new Promise((resolve) => {
		const img = new Image();
		const done = () => resolve();
		img.onload = done;
		img.onerror = done;
		img.src = src;
	});
}

function warmVideo(src: string): Promise<void> {
	return new Promise((resolve) => {
		const v = document.createElement('video');
		v.preload = 'auto';
		v.muted = true;
		v.playsInline = true;
		const done = () => {
			window.clearTimeout(timer);
			resolve();
		};
		const timer = window.setTimeout(done, 20_000);
		v.addEventListener('loadeddata', done, { once: true });
		v.addEventListener('error', done, { once: true });
		v.src = src;
		v.load();
	});
}

function warmAsset(src: string): Promise<void> {
	if (isVideoSrc(src)) return warmVideo(src);
	return warmImage(src);
}

export type LoaderAssetProgress = {
	loaded: number;
	total: number;
	ratio: number;
};

/** Preload map assets; resolves when all attempts finish (errors do not block). */
export async function preloadCriticalMapAssets(
	isMobile: boolean,
	onProgress?: (p: LoaderAssetProgress) => void,
): Promise<void> {
	const assets = getCriticalLoaderAssets(isMobile);
	const total = assets.length;
	let loaded = 0;

	const tick = () => {
		onProgress?.({ loaded, total, ratio: total > 0 ? loaded / total : 1 });
	};

	tick();
	await Promise.all(
		assets.map(async (src) => {
			try {
				await warmAsset(src);
			} finally {
				loaded += 1;
				tick();
			}
		}),
	);
}
