import type { Metadata } from "next";
import { Inter, Mooli } from "next/font/google";
import "@/styles/globals.css";
import ToastHost from "@/components/ui/ToastHost";
import type { ReactNode } from "react";
import VhFixer from "@/components/system/VhFixer";
import { preloadCache } from '@/lib/store';
import dynamic from 'next/dynamic';
import NetworkGuard from '@/components/system/NetworkGuard';
import VideoLoader from '@/components/VideoLoader';
import SocialOAuthBridge from '@/components/SocialOAuthBridge';
import { LOADER_BOOT_SCRIPT } from '@/lib/loaderBootScript';

const AppKitProvider = dynamic(() => import('@/lib/reown').then(m => m.AppKitProvider), { ssr: false });

// Предзагружаем кеш тасков
preloadCache();

const inter = Inter({ subsets: ["latin"] });
const mooli = Mooli({ subsets: ["latin"], weight: "400", variable: "--font-mooli" });

export const metadata: Metadata = {
  title: "The Somnia Odyssey",
  description: "Flagship quests for Somnia Mainnet",
  icons: {
    icon: "/assets/somnia-logo.png",
    shortcut: "/assets/somnia-logo.png",
    apple: "/assets/somnia-logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="odyssey-loading" suppressHydrationWarning>
      <head>
        <link rel="preload" href="/video/loadingMobile.mp4" as="video" type="video/mp4" media="(max-width: 767px)" />
        <link rel="preload" href="/video/loading.MP4" as="video" type="video/mp4" media="(min-width: 768px)" />
      </head>
      <body className={`${inter.className} ${mooli.variable}`}>
        <div
          id="odyssey-loader-gate"
          className="fixed inset-0 z-[2147483647] bg-[#0b0a14] pointer-events-none"
          aria-label="Loading"
          aria-live="polite"
        >
          <video
            id="odyssey-loader-video"
            className="absolute inset-0 h-full w-full object-cover"
            autoPlay
            muted
            playsInline
            preload="auto"
          >
            <source src="/video/loadingMobile.mp4" type="video/mp4" media="(max-width: 767px)" />
            <source src="/video/loading.MP4" type="video/mp4" media="(min-width: 768px)" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 to-black/70" />
          <div className="absolute bottom-24 left-1/2 w-[min(640px,90vw)] -translate-x-1/2">
            <div className="h-3 overflow-hidden rounded-md bg-white/10 backdrop-blur">
              <div
                id="odyssey-loader-progress-bar"
                className="h-full transition-[width] duration-200"
                style={{ width: "0%", backgroundColor: "#78A3C8" }}
              />
            </div>
            <div
              id="odyssey-loader-progress-text"
              className="mt-1 text-center text-[12px] leading-[1.5] tracking-[-0.276px] text-[#8e8e8e]"
              style={{ fontFamily: "var(--font-mooli), system-ui, sans-serif" }}
            >
              0 % Priming Dreamverse...
            </div>
          </div>
        </div>
        <script dangerouslySetInnerHTML={{ __html: LOADER_BOOT_SCRIPT }} />
        <VhFixer />
        <AppKitProvider>
          <VideoLoader />
          <SocialOAuthBridge />
          <div className="odyssey-app-shell">
            <NetworkGuard />
            {children}
          </div>
          <ToastHost />
        </AppKitProvider>
      </body>
    </html>
  );
}
