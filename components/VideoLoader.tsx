"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export default function VideoLoader() {
	const [done, setDone] = useState(false);
	const [progress, setProgress] = useState(0);
	const [mounted, setMounted] = useState(false);
	const rafRef = useRef<number | null>(null);
	const targetRef = useRef(0);
	const settledRef = useRef(false);
	const [videoErrored, setVideoErrored] = useState(false);
	const videoRef = useRef<HTMLVideoElement | null>(null);
	const fullyReadyRef = useRef(false);
	const startTsRef = useRef<number>(Date.now());
	const minShowMsRef = useRef<number>(1200);

	useEffect(() => { setMounted(true); }, []);

	useEffect(() => {
		let perfObs: PerformanceObserver | null = null;
		const compute = () => {
			const parts: number[] = [];
			const fontsLoaded = (document as unknown as { fonts?: { status?: string } }).fonts?.status === "loaded";
			parts.push(fontsLoaded ? 25 : 0);
			const entries = performance.getEntriesByType("resource");
			const total = entries.length || 1;
			const doneCount = entries.filter((e) => (e as PerformanceResourceTiming).responseEnd > 0).length;
			parts.push(Math.min(35, (doneCount / total) * 35));
			const preloads = Array.from(document.querySelectorAll('link[rel="preload"],link[rel="modulepreload"],link[rel="prefetch"]').values()).length;
			parts.push(Math.min(25, preloads * 3));
			const sum = parts.reduce((a, b) => a + b, 0);
			// До полной готовности не даём заполнить до 100%
			const cap = fullyReadyRef.current ? 100 : 99;
			targetRef.current = Math.min(cap, Math.max(sum, targetRef.current));
		};

		try {
			perfObs = new PerformanceObserver(() => compute());
			perfObs.observe({ entryTypes: ["resource"] });
		} catch {}
		(document as unknown as { fonts?: { ready?: Promise<void> } }).fonts?.ready?.then(() => compute());

		const finalize = () => {
			// Помечаем, что страница догрузилась, но даём лайауту/реакту стабилизироваться
			setTimeout(() => { fullyReadyRef.current = true; }, 400);
		};
		if (document.readyState === "complete") finalize();
		const onRS = () => { if (document.readyState === "complete") finalize(); };
		document.addEventListener("readystatechange", onRS);

		const tick = () => {
			setProgress((p) => {
				const delta = Math.max(0, targetRef.current - p);
				const step = Math.max(0.5, delta * 0.12);
				const next = Math.min(100, p + step);
				const enoughTime = Date.now() - startTsRef.current >= minShowMsRef.current;
				if (next >= 100 && fullyReadyRef.current && enoughTime && !settledRef.current) {
					settledRef.current = true;
					setTimeout(() => setDone(true), 600);
				}
				return next;
			});
			rafRef.current = requestAnimationFrame(tick);
		};
		rafRef.current = requestAnimationFrame(tick);
		compute();

		return () => {
			if (rafRef.current) cancelAnimationFrame(rafRef.current);
			try { perfObs?.disconnect(); } catch {}
			document.removeEventListener("readystatechange", onRS);
		};
	}, []);

	useEffect(() => {
		const v = videoRef.current;
		if (!v) return;
		const onErr = () => setVideoErrored(true);
		v.addEventListener("error", onErr);
		v.addEventListener("stalled", onErr);
		v.addEventListener("abort", onErr);
		v.play?.().catch(() => {});
		return () => {
			v.removeEventListener("error", onErr);
			v.removeEventListener("stalled", onErr);
			v.removeEventListener("abort", onErr);
		};
	}, []);

	if (done || !mounted) return null;

	const overlay = (
		<div className="fixed inset-0 pointer-events-none" style={{ zIndex: 2147483647 }} aria-label="Loading">
			<video
				ref={videoRef}
				className={`absolute inset-0 w-full h-full object-cover ${videoErrored ? "hidden" : ""}`}
				autoPlay
				muted
				playsInline
				loop
			>
				<source src="/video/loading.MP4" type="video/mp4" />
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
						className="h-full bg-[color:var(--primary)] transition-[width] duration-200"
						style={{ width: `${Math.round(progress)}%` }}
					/>
				</div>
				<div className="mt-2 text-center text-sm text-white/80 font-mono">
					{Math.round(progress)}%
					<span className="ml-2 opacity-70">Priming Dreamverse…</span>
				</div>
			</div>
		</div>
	);

	return createPortal(overlay, document.body);
}




