import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/styles/globals.css";
import Header from "@/components/Header";
import ToastHost from "@/components/ui/ToastHost";
import type { ReactNode } from "react";
import VhFixer from "@/components/system/VhFixer";
import { preloadCache } from '@/lib/store';
import dynamic from 'next/dynamic';
import NetworkGuard from '@/components/system/NetworkGuard';

const AppKitProvider = dynamic(() => import('@/lib/reown').then(m => m.AppKitProvider), { ssr: false });

// Предзагружаем кеш тасков
preloadCache();

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Somnia Quests",
  description: "Flagship quests for Somnia Mainnet",
  icons: { icon: "/assets/somnia-logo.svg" },
};

export default function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <VhFixer />
        <AppKitProvider>
          <NetworkGuard />
          <Header />
          {children}
          <ToastHost />
        </AppKitProvider>
      </body>
    </html>
  );
}
