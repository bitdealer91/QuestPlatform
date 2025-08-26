export const metadata = {
	title: "Somnia Quests",
	description: "Flagship quests for Somnia Testnet",
	icons: { icon: "/assets/somnia-logo.svg" },
};

import "@/styles/globals.css";
import { AppKitProvider } from "@/lib/reown";
import Header from "@/components/Header";
import ToastHost from "@/components/ui/ToastHost";
import type { ReactNode } from "react";
import VhFixer from "@/components/system/VhFixer";
import { ToastViewport } from '@/components/ui/Toast';
import { preloadCache } from '@/lib/store';

// Предзагружаем кеш тасков
preloadCache().catch(console.error);

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
				<link rel="preload" as="video" href="/video/Loading.mp4" type="video/mp4" />
				<link rel="prefetch" as="video" href="/video/Loading.mp4" />
				<link rel="preload" as="image" href="/assets/background.png" />
			</head>
			<body suppressHydrationWarning>
				<VhFixer />
				<AppKitProvider>
					<Header />
					{children}
				</AppKitProvider>
				<ToastHost />
				<div id="ui-fixed-root" className="ui-fixed-layer" />
			</body>
		</html>
	);
}
