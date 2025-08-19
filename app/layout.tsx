export const metadata = {
	title: "Somnia Quests",
	description: "Flagship quests for Somnia Testnet",
	icons: { icon: "/assets/somnia-logo.svg" },
};

import "@/styles/globals.css";
import { AppKitProvider } from "@/lib/reown";
import Header from "@/components/Header";
import { ToastViewport } from "@/components/ui/Toast";
import type { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
	return (
		<html lang="en" suppressHydrationWarning>
			<head>
				<link rel="preload" as="video" href="/video/Loading.mp4" type="video/mp4" />
				<link rel="prefetch" as="video" href="/video/Loading.mp4" />
				<link rel="preload" as="image" href="/assets/background.png" />
			</head>
			<body suppressHydrationWarning>
				<AppKitProvider>
					<Header />
					{children}
					<ToastViewport />
				</AppKitProvider>
			</body>
		</html>
	);
}
