"use client";
import { useLayoutEffect, useRef } from "react";
import { shouldSkipVideoLoader } from "@/lib/socialOAuthClient";

const MIN_SHOW_MS = 1200;
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
	const fullyReadyRef = useRef(false);
	const videoEndedRef = useRef(false);

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
		let perfObs: PerformanceObserver | null = null;
		let finishTimer = 0;

		const finish = () => {
			if (settledRef.current) return;
			settledRef.current = true;
			setProgress(100);
			removeGate();
			releaseLoaderShell();
		};

		const tryFinish = () => {
			if (settledRef.current) return;
			if (!videoEndedRef.current || !fullyReadyRef.current) return;
			if (Date.now() - startTsRef.current < MIN_SHOW_MS) return;
			window.clearTimeout(finishTimer);
			finishTimer = window.setTimeout(finish, 400);
		};

		const onTimeUpdate = () => {
			const d = Number(video.duration || 0);
			const t = Number(video.currentTime || 0);
			if (d > 0) setProgress((t / d) * 100);
		};

		const onEnded = () => {
			videoEndedRef.current = true;
			setProgress(100);
			tryFinish();
		};

		const onErr = () => {
			// If video fails, still wait for assets + minimum time.
			videoEndedRef.current = true;
			tryFinish();
		};

		const markReady = () => {
			window.setTimeout(() => {
				fullyReadyRef.current = true;
				tryFinish();
			}, 500);
		};

		let removeRS: (() => void) | undefined;
		if (document.readyState === "complete") markReady();
		else {
			const onRS = () => {
				if (document.readyState === "complete") markReady();
			};
			document.addEventListener("readystatechange", onRS);
			removeRS = () => document.removeEventListener("readystatechange", onRS);
		}

		(document as unknown as { fonts?: { ready?: Promise<void> } }).fonts?.ready?.then(() => {
			fullyReadyRef.current = true;
			tryFinish();
		});

		try {
			perfObs = new PerformanceObserver(() => {
				if (document.readyState === "complete") markReady();
			});
			perfObs.observe({ entryTypes: ["resource"] });
		} catch {
			/* noop */
		}

		video.addEventListener("timeupdate", onTimeUpdate);
		video.addEventListener("ended", onEnded);
		video.addEventListener("error", onErr);
		video.addEventListener("stalled", onErr);

		if (video.ended || (video.duration > 0 && video.currentTime >= video.duration - 0.05)) {
			videoEndedRef.current = true;
			setProgress(100);
		}

		const play = () => {
			video.play?.().catch(() => {});
		};
		if (video.readyState >= 2) play();
		else video.addEventListener("loadeddata", play, { once: true });

		const tick = () => {
			tryFinish();
			rafId = requestAnimationFrame(tick);
		};
		rafId = requestAnimationFrame(tick);

		// Safety: never block the app longer than 45s.
		const safety = window.setTimeout(finish, 45_000);

		return () => {
			cancelAnimationFrame(rafId);
			window.clearTimeout(finishTimer);
			window.clearTimeout(safety);
			removeRS?.();
			try {
				perfObs?.disconnect();
			} catch {
				/* noop */
			}
			video.removeEventListener("timeupdate", onTimeUpdate);
			video.removeEventListener("ended", onEnded);
			video.removeEventListener("error", onErr);
			video.removeEventListener("stalled", onErr);
		};
	}, []);

	return null;
}
