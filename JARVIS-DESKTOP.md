# === JARVIS — Desktop companion handoff ===

This repo (`Personal-Dashboard-Desktop`) is the **native Windows client** of the web dashboard. It talks to
the web app at exactly one seam: the token-authed `/api/agent/*` API. Your job here is to keep the desktop
client in step with the web app's agent contract and cut releases. The Windows installer is built by GitHub
Actions — you never build it yourself.

## Access you need (give the public key to Austin)

A dedicated **write** deploy key, scoped to THIS repo only (separate from the web repo's read-only key — you
push code + version tags here, which the read-only web key can't do):

```bash
ssh-keygen -t ed25519 -f ~/.ssh/pdd_desktop_deploy -N "" -C "pdd-desktop deploy"
cat ~/.ssh/pdd_desktop_deploy.pub      # → give this PUBLIC key to Austin
cat >> ~/.ssh/config <<'CFG'
Host github-pdd-desktop
  HostName github.com
  User git
  IdentityFile ~/.ssh/pdd_desktop_deploy
  IdentitiesOnly yes
CFG
git clone git@github-pdd-desktop:austincoveney/Personal-Dashboard-Desktop.git
```

Austin adds the public key at: repo → **Settings → Deploy keys → Add deploy key** → paste → **tick "Allow
write access"**. That is the only account-level grant required; this key reads/writes this one repo, nothing
else.

You also need the **dashboard URL** + **`AGENT_API_TOKEN`** you already hold for the web side (the desktop
uses the same ones to talk to the agent API; they are NOT stored in this repo — the end user pastes them into
the app's Settings). Nothing new to provision.

## The contract that ties the two repos

The desktop depends on the web app ONLY through `/api/agent/*` (full spec: web repo `JARVIS-FINAL.md`). That
contract is **additive** — existing fields/shapes never change. So the desktop never breaks when the web ships;
it simply won't *use* a new endpoint until its client is updated here.

Files that mirror the contract:

- `src/lib/agent.ts` — the typed client + response types. **The file to edit when the contract changes.**
- `src/windows/*` — the UI that surfaces it (Glance reads `context`; Morning/Capture write mood/sleep/note/tasks).

## Keeping the two in sync — the rule

When the WEB app gains or changes an agent endpoint the desktop should surface:

1. Update `src/lib/agent.ts` (types + method) and the relevant window in `src/windows/`.
2. `pnpm install && pnpm build` — typecheck + bundle to validate. (Rust didn't change, so no Windows build needed to validate the client.)
3. Bump the version in **all three**: `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml` (keep them identical).
   - **PATCH** (x.y.Z) = client / UX fixes. **MINOR** (x.Y.0) = surfaces a new web feature. **MAJOR** = Austin only.
4. Commit conventionally, push `main`.
5. `git tag vX.Y.Z && git push origin vX.Y.Z` → `.github/workflows/release.yml` (tauri-action on
   `windows-latest`) builds the MSI and publishes a GitHub Release. Pushes via the deploy key DO trigger the
   workflow.
6. Update the **COMPAT** line below to the web state you synced to.

If the desktop needs something the web doesn't expose yet: add the endpoint on the **web** side first (it owns
the schema + the agent API), ship it, then do the above here.

## Versioning relationship

Independent semver per product (they change at different rates), but **coordinate on shared features**: when a
feature spans both, bump both and name the counterpart version in the commit body. Don't force identical
numbers. Today: web is pre-1.0 (no SoT version constant yet); desktop is at the version in `package.json`.

## COMPAT

- **Desktop v0.1.1** targets the web agent contract as of **2026-06-09**: `GET /api/agent/context`
  (incl. `moodHistory`, `latestSleep`) and writes `mood`, `sleep`, `note`, `tasks`, `now`, `highlight`.
  Web additions beyond this date are not yet surfaced in the desktop client.

## Build / release recap

- Installer build: tag push (`v*`) or manual (Actions → **release** → Run workflow) → MSI attached to the
  GitHub Release. Output: `Austin.s.Deck_<version>_x64_en-US.msi`.
- Local dev (any machine): `pnpm install && pnpm tauri:dev`. Frontend-only in a browser: `pnpm dev` then
  append `?w=glance|morning|capture|settings|widget`.
- The distributable `.exe`/`.msi` must be built on Windows (CI). The Rust shell also compiles on Linux for
  validation (`cd src-tauri && cargo build`).

# === END ===
