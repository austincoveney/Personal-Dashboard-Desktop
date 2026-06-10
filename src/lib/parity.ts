import { BUILT_AGAINST_MANIFEST, DESKTOP_FEATURES } from '@/parity';
import { loadSettings } from '@/lib/settings';
import { isTauri } from '@/lib/window';

export interface ParityResult {
  manifestVersion: string;
  behind: boolean;
  missing: { id: string; name: string }[];
}

interface ManifestFeature {
  id: string;
  name: string;
  platforms: { web: string; desktop: string };
}

// Fetches the canonical manifest and lists web=full features this build doesn't yet ship natively.
export async function checkParity(): Promise<ParityResult | null> {
  const { baseUrl } = await loadSettings();
  if (!baseUrl) return null;
  try {
    const f = isTauri() ? (await import('@tauri-apps/plugin-http')).fetch : fetch;
    const res = await f(`${baseUrl.replace(/\/+$/, '')}/api/manifest`);
    if (!res.ok) return null;
    const m = (await res.json()) as { manifestVersion: string; features: ManifestFeature[] };
    const missing = (m.features ?? [])
      .filter((x) => x.platforms?.web === 'full' && DESKTOP_FEATURES[x.id] !== 'full')
      .map((x) => ({ id: x.id, name: x.name }));
    return {
      manifestVersion: m.manifestVersion,
      behind: m.manifestVersion !== BUILT_AGAINST_MANIFEST || missing.length > 0,
      missing,
    };
  } catch {
    return null;
  }
}
