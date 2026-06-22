import Link from 'next/link';
import type { ReactNode } from 'react';

type Props = {
	title: string;
	children: ReactNode;
};

export default function LegalPage({ title, children }: Props) {
	return (
		<main className="min-h-screen bg-[#0b0a14] px-4 py-10 text-white/90">
			<article className="mx-auto max-w-2xl">
				<Link
					href="/"
					className="text-sm text-[#78a3c8] hover:underline underline-offset-2"
				>
					← Back to Odyssey
				</Link>
				<h1
					className="mt-6 text-2xl font-semibold text-white"
					style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
				>
					{title}
				</h1>
				<div
					className="prose-legal mt-6 space-y-4 text-sm leading-relaxed text-white/75"
					style={{ fontFamily: 'var(--font-mooli), system-ui, sans-serif' }}
				>
					{children}
				</div>
				<p className="mt-10 text-xs text-white/40">Last updated: June 2026</p>
			</article>
		</main>
	);
}
