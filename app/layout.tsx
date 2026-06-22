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
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var p=location.pathname,s=sessionStorage.getItem('odyssey_oauth_popup_v1'),q=location.search;if(p.indexOf('/social/oauth-done')===0||s==='1'||q.indexOf('social_connected=')!==-1||q.indexOf('social_error=')!==-1)return;document.documentElement.classList.add('odyssey-loading');}catch(e){document.documentElement.classList.add('odyssey-loading');}})();`,
          }}
        />
      </head>
      <body className={`${inter.className} ${mooli.variable}`}>
        <VhFixer />
        <AppKitProvider>
          <VideoLoader />
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
