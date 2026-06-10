# Feature parity — desktop ↔ web

This desktop client should natively cover every feature the [web app](https://github.com/austincoveney/Personal-Dashboard)
has. The web app is the **source of truth**; its `features.json` (served at `GET /api/manifest`) is the canonical
list. We catch up to it **manually and continuously** — there's no runtime auto-sync.

## What this build ships

`parity.json` (repo root) declares, per web feature id, what this desktop build implements
(`full | partial | none`) and the `builtAgainstManifest` version. `src/parity.ts` imports it. Keep it honest —
it drives both the launch banner and CI.

## Launch banner

On launch (and Settings → Check), the glance window fetches `${dashboardUrl}/api/manifest`, compares it to
`parity.json`, and shows a banner listing every `web: full` feature this build doesn't yet ship as `full`:
*"Behind the dashboard (N not yet native here): …"*. So drift is impossible to miss.

## Adding a feature here

1. Build the native UI in this repo (a window/section calling the relevant `/api/agent/*` endpoint).
2. Flip its status in `parity.json` (`none`/`partial` → `full`).
3. In the **web** repo, set this feature's `platforms.desktop` to match and bump `manifestVersion` (PATCH).
4. Tag a desktop release (`v*`) — CI ships the updated build; the banner stops flagging it.

## CI

`.github/workflows/parity.yml` runs `scripts/parity-check.mjs`: it validates `parity.json` (known ids, valid
statuses against the canonical manifest) and prints what's not-yet-native. Being *behind* is expected and does
**not** fail the build — only an invalid declaration does.
