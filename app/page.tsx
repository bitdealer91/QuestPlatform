import GalaxyMap from "@/components/Galaxy/GalaxyMap";

export default function Page() {
	return (
		<main className="viewport-lock">
			<section className="absolute inset-0">
				<GalaxyMap />
			</section>
		</main>
	);
}
