import data from '../parity.json';

// What THIS desktop build natively implements, per web feature id. Hand-maintained:
// when you ship a feature natively, bump it here AND set platforms.desktop in the web
// repo's features.json. The canonical feature list lives in the web app (GET /api/manifest).
export const BUILT_AGAINST_MANIFEST: string = data.builtAgainstManifest;
export const DESKTOP_FEATURES = data.features as Record<string, 'full' | 'partial' | 'none'>;
