import GalaxyMap from "@/components/Galaxy/GalaxyMap";

export default async function Page() {
	// Force the route to suspend briefly so app/loading.tsx renders first
	await new Promise((r) => setTimeout(r, 3500)); // minimum ~3.5s loading screen
	return (
		<main className="min-h-[calc(100vh-84px)] bg-galaxy bg-fixed bg-cover bg-center">
			<GalaxyMap />
		</main>
	);
}
