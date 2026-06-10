# Austin's Deck — Personal Dashboard Desktop

A small, native Windows companion to the [Personal Dashboard](https://github.com/austincoveney/Personal-Dashboard) web app. It lives in the system tray, asks how your day is shaping up the moment you boot, and lets you capture a thought, a task, or a mood from anywhere without opening a browser. It talks to the live dashboard (and, through it, Jarvis) over the token-authed agent API.

Built with **Tauri v2** (Rust shell) + **React / Vite / Tailwind v4**, reusing the dashboard's warm-dark design system. Tiny installer, low memory, starts on login.

## What it does

- **Morning check-in** — on the first launch each day it opens a calm prompt: how are you starting, how did you sleep, anything on your mind, any quick things to do. Two taps and it's logged.
- **Quick capture** — a global hotkey (default `Ctrl+Alt+Space`) opens a small capture window from anywhere: note, task, or mood. Posts straight to the dashboard.
- **Glance** — the home window: today's mood, last night's sleep, focus/open task counts, habits, "right now", and your open tasks. Refreshes itself.
- **Pinned widget** — a frameless always-on-top mini panel you can park in a corner of the desktop.
- **Tray** — open the deck, capture, morning check-in, toggle the widget, settings, quit. The app never really closes; closing a window just tucks it back to the tray.
- **Launch at login** — starts quietly in the tray when Windows boots.

Everything writes through the same `/api/agent/*` endpoints Jarvis uses, so a mood or note you log here shows up on the web dashboard (and in Jarvis's context) immediately.

## Install (Windows)

1. Download the latest installer (`...-setup.exe`) from the [Releases](https://github.com/austincoveney/Personal-Dashboard-Desktop/releases) page.
2. Run it. It installs per-user (no admin needed) and adds itself to the tray.
3. On first run it opens **Settings**. Paste:
   - **Dashboard URL** — e.g. `https://austins.dashboard.digigrow.uk`
   - **Agent token** — the `AGENT_API_TOKEN` from the dashboard's server `.env.local`.
4. Click **Test connection**. Green means you're live. Save.

The token and URL are stored locally in the app's data folder (`settings.json`), never synced or committed.

> Requires **WebView2**, which ships with Windows 10/11. On a rare machine without it, the installer pulls it in automatically.

## Configuration

All in the Settings window:

| Setting | Default | Notes |
|---|---|---|
| Dashboard URL | `https://austins.dashboard.digigrow.uk` | The public address of the web dashboard. |
| Agent token | _(empty)_ | `AGENT_API_TOKEN` from the dashboard `.env.local`. |
| Launch at login | on | Start in the tray on boot. |
| Morning check-in | on | Show the boot prompt once per day. |
| Quick-capture shortcut | `CommandOrControl+Alt+Space` | Global hotkey. Restart applies a change. |

## Updates

From **v0.2.0** the app keeps itself current: on launch (and via Settings → Check for updates) it checks the
latest GitHub Release, and if a newer signed build is out it shows an **Install & restart** banner that
applies it in place. Updates are minisign-signed and verified against a public key pinned in the app, so only
releases built by CI are ever installed.

> The first updater-enabled build is **v0.2.0**. If you installed an earlier version, install v0.2.0 once by
> hand; after that it updates itself.

## Develop

```bash
pnpm install
pnpm tauri:dev      # runs the app with hot reload
```

Frontend only (in a browser, no native shell — append `?w=glance|morning|capture|settings|widget`):

```bash
pnpm dev
```

## Build the installer

CI does this automatically (see below). To build locally **on Windows**:

```bash
pnpm install
pnpm tauri:build    # outputs NSIS + MSI installers under src-tauri/target/release/bundle/
```

(The Rust shell compiles on Linux too for validation, but the distributable Windows `.exe` must be built on Windows or via the CI workflow.)

## Releases (CI)

`.github/workflows/release.yml` builds the Windows installer on a `windows-latest` runner and publishes it to a GitHub Release whenever a `v*` tag is pushed:

```bash
# bump version in package.json + src-tauri/tauri.conf.json + src-tauri/Cargo.toml, then:
git tag v0.1.0
git push origin v0.1.0
```

The workflow creates the release and attaches the `.exe`/`.msi`. You can also trigger it manually from the Actions tab (workflow_dispatch).

## Architecture

```
src/                     React frontend (one SPA, routed by Tauri window label)
  windows/               Glance · Morning · Capture · Settings · Widget
  components/            TitleBar, MoodPad, ui/{button,card}
  lib/
    agent.ts             typed client for /api/agent/* (Bearer token, via the http plugin)
    settings.ts          baseUrl + token + flags, persisted with the store plugin
    win-actions.ts       show/hide windows, open the full dashboard
    bootstrap.ts         registers the global quick-capture shortcut
src-tauri/               Tauri v2 Rust shell
  src/lib.rs             tray, single-instance, autostart, close-to-tray, boot-window logic
  tauri.conf.json        five frameless windows, CSP, bundle/installer config
  capabilities/          permission scopes (window, store, http, autostart, shortcut, …)
```

- **One frontend, five windows.** Each Tauri window loads the same SPA; `currentScreen()` reads the window's label and renders the right screen.
- **No CORS headaches.** API calls go through Tauri's HTTP plugin (the request is made from Rust), so the dashboard needs no special CORS config.
- **Boot logic lives in Rust.** On launch it reads the store: no token → Settings; a new day with the check-in enabled → Morning; otherwise tray-only (on autostart) or Glance (manual launch).

## Relationship to the web app

This is the **desktop** half. The **web** half is the separate [`Personal-Dashboard`](https://github.com/austincoveney/Personal-Dashboard) repo (Next.js, deployed behind the Cloudflare Tunnel). The desktop app is a native client of the web app's agent API — it stores no data of its own beyond your URL + token.
