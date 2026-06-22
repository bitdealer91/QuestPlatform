import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
	title: 'Privacy Policy — The Somnia Odyssey',
	description: 'Privacy policy for The Somnia Odyssey quest platform.',
};

export default function PrivacyPage() {
	return (
		<LegalPage title="Privacy Policy">
			<p>
				The Somnia Odyssey (&quot;Odyssey&quot;, &quot;we&quot;) is a quest platform operated in
				connection with the Somnia ecosystem. This policy explains what we collect when you use the
				service at our website and how we use it.
			</p>

			<h2 className="text-base font-medium text-white">Information we collect</h2>
			<ul className="list-disc space-y-2 pl-5">
				<li>
					<strong className="text-white/90">Wallet address</strong> — when you connect a wallet, we
					store it to track quest progress, XP, verification status, and eligibility.
				</li>
				<li>
					<strong className="text-white/90">Social accounts (optional)</strong> — if you connect X
					(Twitter) or Discord, we receive your public username and platform user ID through OAuth.
					We never receive your social media password.
				</li>
				<li>
					<strong className="text-white/90">Quest activity</strong> — completed tasks, timestamps,
					and related metadata needed to run the program.
				</li>
			</ul>

			<h2 className="text-base font-medium text-white">How we use information</h2>
			<p>
				We use this data to operate quests, calculate unlock/eligibility percentages, link social
				accounts for social tasks, and display your progress. We do not sell your personal data.
			</p>

			<h2 className="text-base font-medium text-white">OAuth permissions</h2>
			<p>
				When you connect X, we request read access to your profile (<code>users.read</code>) to
				confirm your username. We do not post on your behalf. You can disconnect linked accounts in
				the app at any time.
			</p>

			<h2 className="text-base font-medium text-white">Storage &amp; infrastructure</h2>
			<p>
				Data is processed and stored using industry-standard hosting (e.g. Vercel) and database
				services (e.g. Upstash Redis). These providers process data on our behalf to run the
				platform.
			</p>

			<h2 className="text-base font-medium text-white">Retention</h2>
			<p>
				We retain quest and account-linking data for as long as needed to operate the program and
				fulfill eligibility/claim requirements, unless a longer period is required by law.
			</p>

			<h2 className="text-base font-medium text-white">Contact</h2>
			<p>
				Questions about this policy: contact the Somnia team through official Somnia communication
				channels or your program administrator.
			</p>
		</LegalPage>
	);
}
