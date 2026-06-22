import type { Metadata } from 'next';
import LegalPage from '@/components/LegalPage';

export const metadata: Metadata = {
	title: 'Terms of Service — The Somnia Odyssey',
	description: 'Terms of service for The Somnia Odyssey quest platform.',
};

export default function TermsPage() {
	return (
		<LegalPage title="Terms of Service">
			<p>
				By using The Somnia Odyssey (&quot;Odyssey&quot;, &quot;the service&quot;), you agree to
				these terms. If you do not agree, do not use the service.
			</p>

			<h2 className="text-base font-medium text-white">The service</h2>
			<p>
				Odyssey provides time-limited quests, XP, and program eligibility tracking for participants
				in the Somnia ecosystem. Rewards, unlock percentages, and claim mechanics are governed by the
				active program rules and may change.
			</p>

			<h2 className="text-base font-medium text-white">Your responsibilities</h2>
			<ul className="list-disc space-y-2 pl-5">
				<li>You control the wallet you connect and are responsible for its security.</li>
				<li>You must complete quests fairly — no bots, sybil abuse, or fraudulent verification.</li>
				<li>Linked X or Discord accounts must be yours. You may disconnect them in the app.</li>
			</ul>

			<h2 className="text-base font-medium text-white">Rewards &amp; eligibility</h2>
			<p>
				Displayed XP, unlock percentages, and claim status are based on program logic and partner
				integrations. We do not guarantee specific token amounts, timing, or availability of claims.
				Final eligibility may be subject to additional review.
			</p>

			<h2 className="text-base font-medium text-white">Third-party services</h2>
			<p>
				The service integrates with third parties (e.g. wallet providers, X, Discord, hosting). Your
				use of those services is subject to their own terms and policies.
			</p>

			<h2 className="text-base font-medium text-white">Disclaimer</h2>
			<p>
				The service is provided &quot;as is&quot; without warranties. To the extent permitted by law,
				we are not liable for indirect or consequential losses arising from use of the service.
			</p>

			<h2 className="text-base font-medium text-white">Changes</h2>
			<p>
				We may update these terms or program rules. Continued use after changes constitutes acceptance
				of the updated terms.
			</p>
		</LegalPage>
	);
}
