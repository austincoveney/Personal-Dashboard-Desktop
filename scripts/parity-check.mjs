import { readFile } from 'node:fs/promises';

// Validates the desktop's parity.json against the canonical web manifest, and reports
// which web=full features this build doesn't yet ship natively. "Behind" is expected and
// NOT a failure (we catch up continuously); only an invalid declaration fails the build.

const MANIFEST_URL =
  'https://raw.githubusercontent.com/austincoveney/Personal-Dashboard/main/features.json';

const decl = JSON.parse(await readFile('parity.json', 'utf8'));
const errors = [];
for (const [id, status] of Object.entries(decl.features)) {
  if (!['full', 'partial', 'none'].includes(status)) errors.push(`bad status "${status}" for "${id}"`);
}

let manifest = null;
try {
  const res = await fetch(MANIFEST_URL);
  if (res.ok) manifest = await res.json();
  else console.warn(`(canonical manifest not reachable yet: HTTP ${res.status} — skipping cross-check)`);
} catch {
  console.warn('(could not fetch canonical manifest — skipping cross-check)');
}

if (manifest) {
  const ids = new Set(manifest.features.map((f) => f.id));
  for (const id of Object.keys(decl.features)) {
    if (!ids.has(id)) errors.push(`parity.json declares unknown feature id "${id}"`);
  }
  const missing = manifest.features
    .filter((f) => f.platforms.web === 'full' && decl.features[f.id] !== 'full')
    .map((f) => f.name);
  console.log(`desktop built against manifest v${decl.builtAgainstManifest}; canonical v${manifest.manifestVersion}`);
  console.log(missing.length ? `Not yet native (${missing.length}): ${missing.join(', ')}` : 'Full native parity.');
}

if (errors.length) {
  console.error(`\nINVALID parity.json:`);
  for (const e of errors) console.error(`  ✗ ${e}`);
  process.exit(1);
}
console.log('parity.json valid.');
