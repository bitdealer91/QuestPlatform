import { access } from "node:fs/promises";
import { resolve } from "node:path";

const base = resolve(process.cwd(), "public/assets");
const files = ["1.png","2.png","3.png","4.png","5.png","6.png","7.png","8.png","map.png","mascot.png"];

const missing = [];
for (const f of files){
	try { await access(resolve(base, f)); } catch { missing.push(f); }
}

if (missing.length){
	console.error("Missing required assets:", missing.join(", "));
	process.exit(1);
}
