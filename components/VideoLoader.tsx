"use client";
import { useLayoutEffect, useRef } from "react";
import { LOADER_MIN_SHOW_MS, preloadCriticalMapAssets } from "@/lib/loaderAssets";
import { shouldSkipVideoLoader } from "@/lib/socialOAuthClient";

const GATE_ID = "odyssey-loader-gate";
const VIDEO_ID = "odyssey-loader-video";
const PROGRESS_BAR_ID = "odyssey-loader-progress-bar";
const PROGRESS_TEXT_ID = "odyssey-loader-progress-text";

function releaseLoaderShell(): void {
	try {
		document.documentElement.classList.remove("odyssey-loading");
	} catch {
		/* noop */
	}
}

function removeGate(): void {
	try {
		document.getElementById(GATE_ID)?.remove();
	} catch {
		/* noop */
	}
}

function setProgress(pct: number): void {
	const rounded = Math.round(Math.max(0, Math.min(100, pct)));
	const bar = document.getElementById(PROGRESS_BAR_ID);
	const text = document.getElementById(PROGRESS_TEXT_ID);
	if (bar) bar.style.width = `${rounded}%`;
	if (text) text.textContent = `${rounded} % Priming Dreamverse...`;
}

export default function VideoLoader() {
	const settledRef = useRef(false);
	const startTsRef = useRef(Date.now());
	const assetsReadyRef = useRef(false);
	const assetRatioRef = useRef(0);
	const videoRatioRef = useRef(0);

	useLayoutEffect(() => {
		if (shouldSkipVideoLoader()) {
			removeGate();
			releaseLoaderShell();
			return;
		}

		const gate = document.getElementById(GATE_ID);
		const video = document.getElementById(VIDEO_ID) as HTMLVideoElement | null;
		if (!gate || !video) {
			releaseLoaderShell();
			return;
		}

		let rafId = 0;
		let finishTimer = 0;
		const isMobile = window.matchMedia("(max-width: 767px)").matches;

		const finish = () => {
			if (settledRef.current) return;
			settledRef.current = true;
			video.loop = false;
			setProgress(100);
			removeGate();
			releaseLoaderShell();
		};

		const updateProgress = () => {
			const elapsed = Date.now() - startTsRef.current;
			const timeRatio = Math.min(1, elapsed / LOADER_MIN_SHOW_MS);
			const blend = Math.max(timeRatio, assetRatioRef.current, videoRatioRef.current);
			setProgress(Math.min(99, blend * 100));
		};

		const tryFinish = () => {
			if (settledRef.current) return;
			const elapsed = Date.now() - startTsRef.current;
			if (elapsed < LOADER_MIN_SHOW_MS) return;
			if (!assetsReadyRef.current) return;
			window.clearTimeout(finishTimer);
			finishTimer = window.setTimeout(finish, 300);
		};

		const onTimeUpdate = () => {
			const d = Number(video.duration || 0);
			const t = Number(video.currentTime || 0);
			if (d > 0) videoRatioRef.current = Math.min(1, t / d);
			updateProgress();
		};

		const onEnded = () => {
			videoRatioRef.current = 1;
			updateProgress();
			tryFinish();
			if (!settledRef.current) {
				video.currentTime = 0;
				video.play?.().catch(() => {});
			}
		};

		const onErr = () => {
			videoRatioRef.current = 1;
			tryFinish();
		};

		video.loop = false;

		void preloadCriticalMapAssets(isMobile, (p) => {
			assetRatioRef.current = p.ratio;
			if (p.ratio >= 1) assetsReadyRef.current = true;
			updateProgress();
			tryFinish();
		}).then(() => {
			assetsReadyRef.current = true;
			assetRatioRef.current = 1;
			updateProgress();
			tryFinish();
		});

		(document as unknown as { fonts?: { ready?: Promise<void> } }).fonts?.ready?.catch(() => {});

		video.addEventListener("timeupdate", onTimeUpdate);
		video.addEventListener("ended", onEnded);
		video.addEventListener("error", onErr);

		const play = () => {
			video.play?.().catch(() => {});
		};
		if (video.readyState >= 2) play();
		else video.addEventListener("loadeddata", play, { once: true });

		const tick = () => {
			updateProgress();
			tryFinish();
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);

		const safety = window.setTimeout(finish, 45_000);

		return () => {
			cancelAnimationFrame(rafId);
			window.clearTimeout(finishTimer);
			window.clearTimeout(safety);
			video.removeEventListener("timeupdate", onTimeUpdate);
			video.removeEventListener("ended", onEnded);
			video.removeEventListener("error", onErr);
		};
	}, []);

	return null;
}
