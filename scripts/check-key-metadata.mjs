#!/usr/bin/env node
// Simple checker for ERC-1155 key metadata and image availability

const args = Object.fromEntries(process.argv.slice(2).map(s => {
  const [k, v] = s.split('=');
  const key = k.replace(/^--/, '');
  return [key, v ?? ''];
}));

const base = (args.base || '').replace(/\/$/, '');
const id = Number(args.id || '1');
const exact = args.exact || '';
if ((exact ? false : (!base || !id || Number.isNaN(id)))){
  console.error('Usage: node scripts/check-key-metadata.mjs --base https://odyssey.somnia.network --id 1');
  process.exit(2);
}

const withTimeout = async (url) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), 12000);
  try {
    const res = await fetch(url, { signal: controller.signal, headers: { 'Accept': 'application/json' } });
    const ctype = res.headers.get('content-type') || '';
    const clen = res.headers.get('content-length') || '';
    return { ok: res.ok, status: res.status, url, contentType: ctype, contentLength: clen, res };
  } finally {
    clearTimeout(t);
  }
};

(async () => {
  try {
    const urls = exact ? [exact] : [
      `${base}/metadata/keys/${id}.json`,
      `${base}/public/metadata/keys/${id}.json`,
    ];
    let meta = null;
    for (const u of urls){
      const r = await withTimeout(u);
      console.log(`[meta] ${u} -> ${r.status} ${r.ok ? 'OK' : 'FAIL'}; type=${r.contentType}`);
      if (r.ok){ meta = r; break; }
    }
    if (!meta){
      console.error('Metadata not found at any tested URL.');
      process.exit(1);
    }
    let json = null;
    try { json = await meta.res.json(); } catch { json = null; }
    if (!json || typeof json !== 'object'){
      console.error('Metadata is not valid JSON.');
      process.exit(1);
    }
    const image = String(json.image || '').trim();
    console.log(`[meta] name=${json.name || ''}; image=${image}`);
    if (!image){
      console.error('No image field in metadata.');
      process.exit(1);
    }
    const img = await withTimeout(image);
    console.log(`[image] ${image} -> ${img.status} ${img.ok ? 'OK' : 'FAIL'}; type=${img.contentType}; size=${img.contentLength}`);
    if (!img.ok){ process.exit(1); }
  } catch (e) {
    console.error('check failed:', e?.message || e);
    process.exit(1);
  }
})();


