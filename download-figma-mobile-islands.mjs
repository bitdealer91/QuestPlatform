#!/usr/bin/env node
/**
 * Скачивает PNG островов из Figma (ноды карусели в `146:3556` / `203:1674`).
 *
 * FIGMA_ACCESS_TOKEN=figd_xxx node download-figma-mobile-islands.mjs
 *
 * Токен: https://www.figma.com/developers/api#access-tokens
 */

import { mkdir, writeFile, copyFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, ".");
const outDir = resolve(root, "public/assets/odyssey/mobile-islands");

const FILE_KEY = "mxf1NvhmBdHC85lg9M0AWD";
/** Слой острова (rounded-rectangle) по неделям — см. metadata групп 203:777, 1683, 1031, 1246, 1247, 1458, 1566, 1672. */
const UNIQUE = [
	["203:111", 1],
	["203:814", 2],
	["203:920", 3],
	["203:1033", 4],
	["203:1140", 5],
	["203:1352", 6],
	["203:1459", 7],
	["203:1565", 8],
];

const token = process.env.FIGMA_ACCESS_TOKEN;
if (!token) {
	console.error("Set FIGMA_ACCESS_TOKEN (see file header).");
	process.exit(1);
}

const idsParam = UNIQUE.map(([id]) => id).join(",");
const url = `https://api.figma.com/v1/images/${FILE_KEY}?ids=${encodeURIComponent(idsParam)}&format=png&scale=2`;

const res = await fetch(url, { headers: { "X-Figma-Token": token } });
if (!res.ok) {
	const t = await res.text();
	console.error("Figma API error:", res.status, t.slice(0, 500));
	process.exit(1);
}
const json = await res.json();
const images = json.images || {};

await mkdir(outDir, { recursive: true });

for (const [nodeId, week] of UNIQUE) {
	const imgUrl = images[nodeId];
	if (!imgUrl) {
		console.error("No image URL for", nodeId);
		process.exit(1);
	}
	const png = await fetch(imgUrl);
	if (!png.ok) {
		console.error("Failed to download", nodeId, png.status);
		process.exit(1);
	}
	const buf = Buffer.from(await png.arrayBuffer());
	const dest = resolve(outDir, `week-${week}.png`);
	await writeFile(dest, buf);
	console.log("Wrote", dest);
}
