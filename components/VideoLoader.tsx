"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { shouldSkipVideoLoader } from "@/lib/socialOAuthClient";

const FIRST_LOADER_KEY = "odyssey_loader_seen_v1";

function releaseLoaderShell(): void {
	try {
		document.documentElement.classList.remove("odyssey-loading");
	} catch {
		/* noop */
	}
}

function lockLoaderShell(): void {
	try {
		document.documentElement.classList.add("odyssey-loading");
	} catch {
		/* noop */
	}
}

export default function VideoLoader() {
	const [done, setDone] = useState(() => {
		if (typeof window !== "undefined" && shouldSkipVideoLoader()) {
			releaseLoaderShell();
			return true;
		}
		return false;
	});
	const [progress, setProgress] = useState(0);
	const [mounted, setMounted] = useState(false);
	const [firstVisitMode, setFirstVisitMode] = useState<boolean | null>(null);
	const [preferMobileVideo, setPreferMobileVideo] = useState(false);
	const rafRef = useRef<number | null>(null);
	const targetRef = useRef(0);
	const settledRef = useRef(false);
	const [videoErrored, setVideoErrored] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const fullyReadyRef = useRef(false);
	const videoEndedRef = useRef(false);
	const startTsRef = useRef<number>(Date.now());
	const minShowMsRef = useRef<number>(1200);

	const finish = useRef(() => {
		if (settledRef.current) return;
		settledRef.current = true;
		setProgress(100);
		try {
			window.localStorage.setItem(FIRST_LOADER_KEY, "1");
		} catch {
			/* noop */
		}
		releaseLoaderShell();
		setDone(true);
	});

	useEffect(() => {
		setMounted(true);
		if (!shouldSkipVideoLoader()) lockLoaderShell();
	}, []);

	useEffect(() => {
		if (shouldSkipVideoLoader()) {
			releaseLoaderShell();
			setDone(true);
		}
	}, [mounted]);

	useEffect(() => {
		if (!mounted) return;
		try {
			setPreferMobileVideo(window.matchMedia("(max-width: 767px)").matches);
		} catch {
			setPreferMobileVideo(false);
		}
	}, [mounted]);

	useEffect(() => {
		if (!mounted) return;
		try {
			const seen = window.localStorage.getItem(FIRST_LOADER_KEY) === "1";
			setFirstVisitMode(!seen);
		} catch {
			setFirstVisitMode(false);
		}
	}, [mounted]);

	const tryFinishFirstVisit = useRef(() => {
		if (firstVisitMode !== true || !videoEndedRef.current) return;
		const enoughTime = Date.now() - startTsRef.current >= minShowMsRef.current;
		if (fullyReadyRef.current && enoughTime) finish.current();
	});

	useEffect(() => {
		tryFinishFirstVisit.current = () => {
			if (firstVisitMode !== true || !videoEndedRef.current) return;
			const enoughTime = Date.now() - startTsRef.current >= minShowMsRef.current;
			if (fullyReadyRef.current && enoughTime) finish.current();
		};
	}, [firstVisitMode]);

	useEffect(() => {
		if (firstVisitMode !== true) return;
		const v = videoRef.current;
		if (v && (v.ended || v.currentTime >= (v.duration || 0) - 0.05)) {
			videoEndedRef.current = true;
			tryFinishFirstVisit.current();
		}
	}, [firstVisitMode]);

	// Track fonts/resources until the page is fully ready (all visit modes).
	useEffect(() => {
		if (!mounted || done) return;

		let perfObs: PerformanceObserver | null = null;
		const compute = () => {
			if (firstVisitMode === false) {
				const parts: number[] = [];
				const fontsLoaded =
					(document as unknown as { fonts?: { status?: string } }).fonts?.status === "loaded";
				parts.push(fontsLoaded ? 25 : 0);
				const entries = performance.getEntriesByType("resource");
				const total = entries.length || 1;
				const doneCount = entries.filter((e) => (e as PerformanceResourceTiming).responseEnd > 0).length;
				parts.push(Math.min(35, (doneCount / total) * 35));
				const preloads = Array.from(
					document.querySelectorAll('link[rel="preload"],link[rel="modulepreload"],link[rel="prefetch"]').values(),
				).length;
				parts.push(Math.min(25, preloads * 3));
				const sum = parts.reduce((a, b) => a + b, 0);
				const cap = fullyReadyRef.current ? 100 : 99;
				targetRef.current = Math.min(cap, Math.max(sum, targetRef.current));
			}
		};

		try {
			perfObs = new PerformanceObserver(() => compute());
			perfObs.observe({ entryTypes: ["resource"] });
		} catch {
			/* noop */
		}
		(document as unknown as { fonts?: { ready?: Promise<void> } }).fonts?.ready?.then(() => compute());

		const markReady = () => {
			setTimeout(() => {
				fullyReadyRef.current = true;
				tryFinishFirstVisit.current();
			}, 400);
		};
		if (document.readyState === "complete") markReady();
		const onRS = () => {
			if (document.readyState === "complete") markReady();
		};
		document.addEventListener("readystatechange", onRS);

		const tick = () => {
			setProgress((p) => {
				if (firstVisitMode === true) return p;
				const delta = Math.max(0, targetRef.current - p);
				const step = Math.max(0.5, delta * 0.12);
				const next = Math.min(100, p + step);
				const enoughTime = Date.now() - startTsRef.current >= minShowMsRef.current;
				if (next >= 100 && fullyReadyRef.current && enoughTime && !settledRef.current) {
					setTimeout(() => finish.current(), 600);
				}
				return next;
			});
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		compute();

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			try {
				perfObs?.disconnect();
			} catch {
				/* noop */
			}
			document.removeEventListener("readystatechange", onRS);
		};
	}, [mounted, done, firstVisitMode]);

	useEffect(() => {
		const v = videoRef.current;
		if (!v || done) return;
		const onErr = () => {
			if (preferMobileVideo) {
				setPreferMobileVideo(false);
				return;
			}
			setVideoErrored(true);
			if (firstVisitMode) setFirstVisitMode(false);
		};
		const onTimeUpdate = () => {
			if (firstVisitMode !== true) return;
			const d = Number(v.duration || 0);
			const t = Number(v.currentTime || 0);
			if (d > 0) setProgress(Math.max(0, Math.min(100, (t / d) * 100)));
		};
		const onEnded = () => {
			videoEndedRef.current = true;
			if (firstVisitMode !== true) return;
			setProgress(100);
			tryFinishFirstVisit.current();
		};
		v.addEventListener("error", onErr);
		v.addEventListener("stalled", onErr);
		v.addEventListener("abort", onErr);
		v.addEventListener("timeupdate", onTimeUpdate);
		v.addEventListener("ended", onEnded);
		v.play?.().catch(() => {});
		return () => {
			v.removeEventListener("error", onErr);
			v.removeEventListener("stalled", onErr);
			v.removeEventListener("abort", onErr);
			v.removeEventListener("timeupdate", onTimeUpdate);
			v.removeEventListener("ended", onEnded);
		};
	}, [firstVisitMode, preferMobileVideo, done]);

	if (done) return null;
	if (!mounted) return null;

	const overlay = (
		<div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2147483647 }} aria-label="Loading">
			<video
				key={preferMobileVideo ? "mobile-loader" : "desktop-loader"}
				ref={videoRef}
				className={`absolute inset-0 w-full h-full object-cover ${videoErrored ? "hidden" : ""}`}
				autoPlay
				muted
				playsInline
				loop={firstVisitMode !== true}
			>
				<source src={preferMobileVideo ? "/video/loadingMobile.mp4" : "/video/loading.MP4"} type="video/mp4" />
			</video>
			{videoErrored && (
				<div className="absolute inset-0">
					<div className="w-full h-full bg-[radial-gradient(60%_50%_at_50%_40%,rgba(178,108,255,.25),transparent_60%),radial-gradient(40%_40%_at_60%_60%,rgba(69,214,255,.18),transparent_60%),#0b0a14]" />
				</div>
			)}
			<div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
			<div className="absolute bottom-24 left-1/2 -translate-x-1/2 w-[min(640px,90vw)]">
				<div className="h-3 rounded-md overflow-hidden bg-white/10 backdrop-blur">
					<div
						className="h-full transition-[width] duration-200"
						style={{ width: `${Math.round(progress)}%`, backgroundColor: "#78A3C8" }}
					/>
				</div>
				<div
					className="mt-1 text-center text-[12px] leading-[1.5] tracking-[-0.276px] text-[#8e8e8e]"
					style={{ fontFamily: "var(--font-mooli), system-ui, sans-serif" }}
				>
					{`${Math.round(progress)} % Priming Dreamverse...`}
				</div>
			</div>
		</div>
	);

	return createPortal(overlay, document.body);
}
