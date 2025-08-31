export default function Loading() {
  return (
    <div className="fixed inset-0 bg-black flex items-center justify-center" style={{ zIndex: 2147483646 }} aria-label="Loading">
      <video
        className="max-w-[100vw] max-h-[100vh] w-auto h-auto object-contain"
        autoPlay
        muted
        playsInline
        loop
        preload="auto"
      >
        <source src="/video/loading.MP4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 w-[min(640px,90vw)]" style={{ bottom: `calc(20px + env(safe-area-inset-bottom, 0px))` }}>
        <div className="h-3 rounded-md overflow-hidden bg-white/10 backdrop-blur">
          <div className="h-full bg-[color:var(--primary)] animate-loading" />
        </div>
        <div className="mt-2 text-center text-sm text-white/80 font-mono">Loading…</div>
      </div>
    </div>
  );
}


