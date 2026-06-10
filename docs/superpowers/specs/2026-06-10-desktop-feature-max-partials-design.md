# Desktop feature-max — promote the 7 "partial" features to "full"

**Date:** 2026-06-10
**Repos:** `Personal-Dashboard-Desktop` (this) + `Personal-Dashboard` (web, source of truth)
**Status:** approved design — implementation pending

## Goal

Promote the seven `partial` features in the parity manifest to `full` by natively building
each in the desktop companion, shrinking the launch ParityBanner one feature at a time. The
seven: **my-day, mood, tasks, notes, sleep, habits, life**. (The six `none` features —
journal, fitness, diet, guitar, achievements, fuel — are a separate later effort.)

## Locked decisions

1. **"full" = companion-complete, not web-mirror.** Each feature is built to cover what you'd
   genuinely do from a tray companion — not to reproduce the entire web page. Heavy web-only
   analysis and full-history browsing stay in the browser.
2. **Hybrid per-feature API extension.** The web agent API is create-only (`POST`) plus one
   aggregate `GET /api/agent/context`. Extend it **only where a companion needs read/edit**
   that `context` can't serve. Web remains the source of truth; every manifest change
   originates in the web repo.
3. **Sidebar-rail "Deck" main window.** The existing `glance` window grows a thin left
   icon-rail; feature sections route inside React (no new Tauri windows).
4. **One increment = two PRs** (web first, then desktop), each flipping the manifest/parity.

## A. The Deck shell (desktop only — first PR, flips nothing in parity.json)

- Expand the `glance` window into the **Deck**: a thin left icon-rail + a routed content area.
  Keep the Tauri window **label `glance`** so the Rust boot logic is unchanged.
- Sections: **Today** (the current Glance content verbatim — momentum tiles, "right now",
  open-tasks list), then **Mood, Tasks, Notes, Sleep, Habits, Life**.
- Section routing is **React state inside the one window**, not new windows. Capture (global
  hotkey), Morning, Settings, and Widget windows are untouched.
- The current Glance footer actions (open dashboard, refresh, settings) stay inside the **Today**
  section for the shell increment; Capture stays a prominent action. (Promoting them to global
  rail-foot actions is deferred polish — settings is already reachable from the system-tray menu.)
- **Fixed Deck size** (~580×640, each section scrolls) — no per-section window resize, to avoid
  jank. Dynamic resize is possible later polish, explicitly out of scope here.
- Empty section placeholders ship in this PR so the rail is complete; features fill in per
  increment.
- **Agent client read/mutate layer** (`src/lib/agent.ts` generic `GET`/`PATCH`/`DELETE`; the
  internal `request()` already supports them) is added with the **first increment that needs a
  new verb** (tasks), not the shell — YAGNI. The shell ships pure navigation scaffolding.

## B. Per-feature "full" surface + minimal web-API extension

`GET /api/agent/context` already returns: `latestMood`, `moodHistory` (14), `latestSleep`,
`openTasks`, `achievementsToday`, `dayPlan`, `now`, `reading` (status=reading only), `habits`
(`{id,name,cadence,target,doneToday}`). New endpoints are added only to fill real gaps.

| Feature | Companion-"full" surface | Web API to add |
|---|---|---|
| **my-day** | Render `dayPlan` narrative + blocks + focus tasks + today's wins (all from `context`) | **none** |
| **mood** | Log (existing MoodPad) + recent history & trend from `context.moodHistory` + delete a mis-log | `DELETE /api/agent/mood/:id` *(optional)* |
| **habits** | List + check-in toggle (existing `POST habit-checkin`, `done` true/false) + current streak | add `streak:number` to `context.habits[]` |
| **tasks** | List open (`context.openTasks`) + create + complete/reopen, toggle focus, cycle priority, edit title, delete | `PATCH /api/agent/tasks/:id`, `DELETE /api/agent/tasks/:id` |
| **sleep** | Log (existing `POST sleep`, 19h fix already merged) + recent history + edit/delete last entry | `GET /api/agent/sleep?days=N`, `PATCH`+`DELETE /api/agent/sleep/:id` |
| **notes** | List + create + edit + pin/unpin + delete (`context` returns **no** notes today) | `GET /api/agent/note`, `PATCH /api/agent/note/:id`, `DELETE /api/agent/note/:id` |
| **life** | **now**: set + read (done). **reading**: list all + create + status/rate + delete | `GET /api/agent/reading`, `PATCH /api/agent/reading/:id`, `DELETE /api/agent/reading/:id` |

### Out of scope (noted honestly, not silently dropped)
- Web-only analysis: sleep regularity/need model, full mood-insight graphs.
- Reading-list "personal-dev" sub-block (no agent endpoint exists).
- Pagination / full unbounded history (companion shows recent only).
- `DELETE` endpoints marked *(optional)* may be dropped to keep the API surface minimal —
  decide per increment.

## C. Endpoint conventions + the parity loop

- **Routing:** item-level ops live at `src/app/api/agent/<x>/[id]/route.ts` (PATCH/DELETE); a
  `GET` list handler is added alongside the existing `POST` in `src/app/api/agent/<x>/route.ts`.
- **Reuse:** the existing per-feature Zod schemas and the Bearer agent-auth guard
  (`src/lib/agent-auth.ts`). Validate all inputs; parameterized DB access as today.
- **Manifest stays valid:** sub-routes (`/[id]`) are implementation detail — a feature's
  `agentEndpoints` list in `features.json` keeps its **primary** endpoint(s) only. The web
  `scripts/parity-check.mjs` reverse-check reads only top-level `api/agent/*` dirs and skips
  `[`-prefixed names, so nested `[id]` routes don't trip drift detection.
- **Per increment (one feature = two PRs):**
  1. **web PR** — add the endpoint(s); set that feature's `platforms.desktop:"full"` in
     `features.json`; bump `manifestVersion` PATCH. (CI bump-enforcement fires because an
     agent route changed — the intended workflow.)
  2. **desktop PR** — build the section; flip the feature in `parity.json` `none/partial → full`;
     tag a `v*` release. The banner drops that feature.

## D. Sequencing

Cheap + high-value first so the banner moves early:

1. **Deck shell** (desktop only — frame + rail + routing + Today + empty sections).
2. **my-day → full** (desktop only; no web API).
3. **mood → full** (history from `context`; optional delete).
4. **habits → full** (small `streak` add to `context`).
5. **tasks → full** (`PATCH`/`DELETE`).
6. **sleep → full** (`GET` history + `PATCH`/`DELETE`).
7. **notes → full** (`GET`/`PATCH`/`DELETE`).
8. **life → full** (`GET`/`PATCH`/`DELETE` reading + now).

## Risks / notes

- **Live manifest reachability:** the desktop banner reads `${baseUrl}/api/manifest`, which
  currently 307→/login because the live dashboard build predates the manifest merge. It serves
  publicly once the dashboard redeploys. Doesn't block building features; does block seeing the
  banner shrink against the live URL until a deploy happens.
- **Design skills:** each feature section is real UI — invoke the frontend/design skill set
  (impeccable, interface-design, micro-interactions, refactoring-ui-principles, 8pt-grid,
  accessibility, anti-ai-web-design) and match the ported warm-dark Identity Anchor.
- **Window label:** must stay `glance` — Rust `setup` boot logic shows the window by that label.
