import GalaxyMap from "@/components/Galaxy/GalaxyMap";

export default async function Page() {
	await new Promise((r) => setTimeout(r, 3500));
	return (
		<main className="viewport-lock">
			<section className="absolute inset-0">
				<GalaxyMap />
			</section>
		</main>
	);
}
