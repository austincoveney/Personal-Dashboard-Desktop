# Mood → full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote `mood` from `partial` to `full` — a dedicated Mood section that logs via the existing `MoodPad` and shows recent history + trend from `context.moodHistory`. No new web endpoints (delete-a-mislog deferred).

**Architecture:** New `Mood` section: a `MoodPad` logger (reuses the component Capture uses) + a chronological valence trend strip with the latest label and a trend arrow. Pure helpers (`moodTrend`, `moodsOldestFirst`, `valenceBg`) are unit-tested. The Deck's content switch is refactored to a `sectionView()` so built sections slot in cleanly. Two PRs: web manifest flip, then the desktop section.

**Tech Stack:** React 19, Tailwind v4, lucide-react, Vitest + Testing Library, TS strict. Warm-dark Identity Anchor; mint=positive valence, amber-`warning`=rough, `accent-rule`/`tnum`/`font-display`.

---

## File structure

- **Web repo** (`/home/austin/development/personal/Personal Dashboard`): `features.json` (flip + bump).
- Create `src/lib/mood.ts` (+ `.test.ts`) — `moodTrend`, `moodsOldestFirst`, `valenceBg`.
- Create `src/windows/sections/Mood.tsx` (+ `.test.tsx`) — the section.
- Modify `src/windows/Deck.tsx` (+ `Deck.test.tsx`) — `sectionView()` switch incl. Mood.
- Modify `parity.json`, `package.json`, `src-tauri/tauri.conf.json` — flip + version.

---

## Task 1: Web manifest flip (web repo — separate branch + PR)

**Files:** Modify `features.json` in `/home/austin/development/personal/Personal Dashboard`.

- [ ] **Step 1: Branch**

```bash
cd "/home/austin/development/personal/Personal Dashboard"
git checkout main && git pull --ff-only
git checkout -b chore/manifest-mood-desktop-full
```

- [ ] **Step 2: Edit `features.json`** — two changes:
  1. `"manifestVersion": "1.0.1"` → `"manifestVersion": "1.0.2"`.
  2. In the `mood` feature object: `"platforms": { "web": "full", "desktop": "partial" }` → `"platforms": { "web": "full", "desktop": "full" }`.

- [ ] **Step 3: Verify**

Run: `node scripts/parity-check.mjs`
Expected: `parity OK …` with summary `desktop full 2/13`.

- [ ] **Step 4: Commit + push + PR**

```bash
git add features.json
git commit -m "chore(parity): mark mood desktop=full, bump manifest 1.0.2

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin chore/manifest-mood-desktop-full
gh pr create --base main --head chore/manifest-mood-desktop-full \
  --title "chore(parity): mood desktop=full (manifest 1.0.2)" \
  --body "Desktop ships native Mood (log + history/trend) as of feature-max increment 3. Metadata-only manifest flip + PATCH bump; no app code, APP_VERSION unchanged. Pairs with desktop PR feat/mood-section."
```

---

## Task 2: Mood helpers (TDD, desktop)

You are on branch `feat/mood-section` in the desktop repo for all remaining tasks.

**Files:** Create `src/lib/mood.ts`; create `src/lib/mood.test.ts`.

- [ ] **Step 1: Write the failing test** `src/lib/mood.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { MoodSummary } from '@/lib/agent';
import { moodTrend, moodsOldestFirst, valenceBg } from '@/lib/mood';

const m = (valence: number, loggedAt: string): MoodSummary => ({ valence, energy: 0, loggedAt });

describe('moodsOldestFirst', () => {
  it('sorts by loggedAt ascending without mutating input', () => {
    const input = [m(2, '2026-06-10T08:00:00Z'), m(0, '2026-06-08T08:00:00Z'), m(1, '2026-06-09T08:00:00Z')];
    const out = moodsOldestFirst(input);
    expect(out.map((x) => x.loggedAt)).toEqual([
      '2026-06-08T08:00:00Z',
      '2026-06-09T08:00:00Z',
      '2026-06-10T08:00:00Z',
    ]);
    expect(input[0]?.loggedAt).toBe('2026-06-10T08:00:00Z');
  });
});

describe('moodTrend', () => {
  it('is up when the latest valence beats the previous', () => {
    expect(moodTrend([m(0, '2026-06-09T08:00:00Z'), m(2, '2026-06-10T08:00:00Z')])).toBe('up');
  });
  it('is down when the latest valence is lower', () => {
    expect(moodTrend([m(1, '2026-06-09T08:00:00Z'), m(-1, '2026-06-10T08:00:00Z')])).toBe('down');
  });
  it('is flat when equal', () => {
    expect(moodTrend([m(1, '2026-06-09T08:00:00Z'), m(1, '2026-06-10T08:00:00Z')])).toBe('flat');
  });
  it('is null with fewer than two entries', () => {
    expect(moodTrend([m(1, '2026-06-10T08:00:00Z')])).toBeNull();
    expect(moodTrend([])).toBeNull();
  });
});

describe('valenceBg', () => {
  it('maps valence to a tone token', () => {
    expect(valenceBg(2)).toBe('bg-mint');
    expect(valenceBg(1)).toBe('bg-mint');
    expect(valenceBg(0)).toBe('bg-muted-foreground');
    expect(valenceBg(-1)).toBe('bg-warning');
    expect(valenceBg(-2)).toBe('bg-warning');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm test src/lib/mood.test.ts`
Expected: FAIL — cannot resolve `@/lib/mood`.

- [ ] **Step 3: Implement** `src/lib/mood.ts`:
```ts
import type { MoodSummary } from '@/lib/agent';

export function moodsOldestFirst(history: MoodSummary[]): MoodSummary[] {
  return [...history].sort((a, b) => (a.loggedAt ?? '').localeCompare(b.loggedAt ?? ''));
}

export function moodTrend(history: MoodSummary[]): 'up' | 'down' | 'flat' | null {
  const ordered = moodsOldestFirst(history);
  if (ordered.length < 2) return null;
  const latest = ordered[ordered.length - 1];
  const prev = ordered[ordered.length - 2];
  if (!latest || !prev) return null;
  if (latest.valence > prev.valence) return 'up';
  if (latest.valence < prev.valence) return 'down';
  return 'flat';
}

export function valenceBg(valence: number): string {
  if (valence >= 1) return 'bg-mint';
  if (valence <= -1) return 'bg-warning';
  return 'bg-muted-foreground';
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `pnpm test src/lib/mood.test.ts`
Expected: PASS (all describes green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/mood.ts src/lib/mood.test.ts
git commit -m "feat(mood): trend + valence-tone helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: The Mood section (TDD)

**Files:** Create `src/windows/sections/Mood.tsx`; create `src/windows/sections/Mood.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Mood.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type MoodSummary } from '@/lib/agent';

const history: MoodSummary[] = [
  { valence: 0, energy: 0, loggedAt: '2026-06-09T08:00:00Z' },
  { valence: 2, energy: 1, loggedAt: '2026-06-10T08:00:00Z' },
];

vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({
    data: { moodHistory: history, latestMood: history[1] },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { Mood } from '@/windows/sections/Mood';

describe('Mood', () => {
  it('shows the recent count and the latest label', () => {
    render(<Mood />);
    expect(screen.getByText('Last 2')).toBeInTheDocument();
    expect(screen.getByText(/great/i)).toBeInTheDocument();
  });

  it('logs the picked mood via the agent', async () => {
    const spy = vi.spyOn(agent, 'logMood').mockResolvedValue({});
    render(<Mood />);
    await userEvent.click(screen.getByRole('button', { name: 'great · wired' }));
    await userEvent.click(screen.getByRole('button', { name: /Log mood/i }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ valence: 2, energy: 2 }));
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm test src/windows/sections/Mood.test.tsx`
Expected: FAIL — cannot resolve `@/windows/sections/Mood`.

- [ ] **Step 3: Implement** `src/windows/sections/Mood.tsx`:
```tsx
import { Check, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { MoodPad } from '@/components/MoodPad';
import { Button } from '@/components/ui/button';
import { agent } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { moodLabel } from '@/lib/format';
import { moodTrend, moodsOldestFirst, valenceBg } from '@/lib/mood';
import { useAgentContext } from '@/lib/use-context';

const TREND_ICON: Record<'up' | 'down' | 'flat', typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

export function Mood() {
  const { data, refresh } = useAgentContext();
  const [valence, setValence] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const history = data?.moodHistory ?? [];
  const latest = data?.latestMood ?? null;
  const trend = moodTrend(history);
  const TrendIcon = trend ? TREND_ICON[trend] : null;

  async function submit() {
    if (valence === null || energy === null) return;
    setErr(null);
    setBusy(true);
    try {
      await agent.logMood({ valence, energy, note: note.trim() || undefined });
      setValence(null);
      setEnergy(null);
      setNote('');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            How are you?
          </p>
          <h1 className="font-display text-xl tracking-tight">Log a mood</h1>
        </header>

        <MoodPad
          valence={valence}
          energy={energy}
          onChange={(v, e) => {
            setValence(v);
            setEnergy(e);
          }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's behind it? (optional)"
          className="h-9 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button onClick={submit} disabled={busy || valence === null} size="sm" className="w-full">
          <Check className="size-3.5" /> {busy ? 'Saving…' : 'Log mood'}
        </Button>

        <div className="accent-rule" />

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No moods logged yet — your first one starts the trend.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Last {history.length}
              </p>
              {latest && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {moodLabel(latest.valence, latest.energy)}
                  {TrendIcon && (
                    <TrendIcon
                      className={cn(
                        'size-3.5',
                        trend === 'up'
                          ? 'text-mint'
                          : trend === 'down'
                            ? 'text-warning'
                            : 'text-muted-foreground',
                      )}
                    />
                  )}
                </p>
              )}
            </div>
            <div className="flex items-end gap-1">
              {moodsOldestFirst(history).map((mood, i) => (
                <span
                  key={mood.loggedAt ?? i}
                  title={moodLabel(mood.valence, mood.energy)}
                  className={cn('h-6 flex-1 rounded-sm', valenceBg(mood.valence))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `pnpm test src/windows/sections/Mood.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/windows/sections/Mood.tsx src/windows/sections/Mood.test.tsx
git commit -m "feat(mood): native Mood section — log + trend strip

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Wire Mood into the Deck

**Files:** Modify `src/windows/Deck.tsx`; modify `src/windows/Deck.test.tsx`.

- [ ] **Step 1: Replace the ENTIRE contents of `src/windows/Deck.tsx`** with:
```tsx
import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { Rail } from '@/components/Rail';
import { registerShortcuts } from '@/lib/bootstrap';
import { SECTIONS, type SectionId } from '@/lib/sections';
import { Today } from '@/windows/sections/Today';
import { Mood } from '@/windows/sections/Mood';
import { Placeholder } from '@/windows/sections/Placeholder';

function sectionView(id: SectionId): ReactElement {
  switch (id) {
    case 'today':
      return <Today />;
    case 'mood':
      return <Mood />;
    default:
      return <Placeholder title={SECTIONS.find((s) => s.id === id)?.label ?? ''} />;
  }
}

export function Deck() {
  const [active, setActive] = useState<SectionId>('today');

  useEffect(() => {
    void registerShortcuts();
  }, []);

  return (
    <div className="app-shell flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Rail active={active} onSelect={setActive} />
        <div className="min-w-0 flex-1">{sectionView(active)}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add a Mood-routing assertion to `src/windows/Deck.test.tsx`.** The existing two tests stay. The existing mocks already stub `@/lib/use-context`, `@/lib/bootstrap`, and the two banners — those also cover Mood (it uses `useAgentContext`). Add this third test inside the `describe('Deck', () => { … })` block, after the existing two `it(...)` blocks:
```tsx
  it('renders the Mood section when Mood is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Mood' }));
    expect(screen.getByRole('heading', { name: 'Log a mood' })).toBeInTheDocument();
  });
```

- [ ] **Step 3: Typecheck + full suite**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc clean; all suites green (sections, Rail, Deck incl. the new Mood-routing test, day-plan, Agenda, Wins, mood, Mood).

- [ ] **Step 4: Commit**

```bash
git add src/windows/Deck.tsx src/windows/Deck.test.tsx
git commit -m "feat(mood): route the Mood section in the Deck

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Flip parity + bump version

**Files:** Modify `parity.json`; `package.json`; `src-tauri/tauri.conf.json`.

- [ ] **Step 1: `parity.json`** — two changes:
  1. `"builtAgainstManifest": "1.0.1"` → `"builtAgainstManifest": "1.0.2"`.
  2. `"mood": "partial"` → `"mood": "full"`.

- [ ] **Step 2: Bump version `0.2.2` → `0.2.3`** in BOTH `package.json` (`"version"`) and `src-tauri/tauri.conf.json` (`"version"` field near the top).

- [ ] **Step 3: Validate**

Run: `node scripts/parity-check.mjs` (expect `parity.json valid.`)
Run: `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('json ok')"` (expect `json ok`)

- [ ] **Step 4: Commit**

```bash
git add parity.json package.json src-tauri/tauri.conf.json
git commit -m "chore(parity): mood full, builtAgainstManifest 1.0.2, v0.2.3

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Verification + desktop PR

- [ ] **Step 1: Gate**

Run: `pnpm build && pnpm test && node scripts/parity-check.mjs`
Expected: build clean; all tests green; `parity.json valid`.

- [ ] **Step 2: Manual smoke (browser)**

`pnpm dev`, open `http://localhost:1420/?w=glance`, click **Mood** in the rail. The MoodPad logs; picking a cell enables "Log mood"; the trend strip + latest label render (empty-state text if no history against the live data). Stop the server.

- [ ] **Step 3: Push + PR** (after the web Task 1 PR is open)

```bash
git push -u origin feat/mood-section
gh pr create --base main --head feat/mood-section \
  --title "feat(mood): native Mood section — log + trend strip (parity full)" \
  --body "Increment 3 of feature-max. Promotes mood partial→full: a Mood section that logs via the existing MoodPad and shows recent history as a chronological valence trend strip with the latest label + trend arrow, from /api/agent/context (no new endpoints; delete-a-mislog deferred). Refactors the Deck content switch to sectionView(). Flips parity.json mood=full + builtAgainstManifest 1.0.2; desktop v0.2.3. Pairs with web PR chore/manifest-mood-desktop-full (merge first). New tests: mood helpers, Mood section, Deck Mood-routing."
```

---

## Definition of done

- Web PR open: `features.json` manifest 1.0.2 + mood desktop=full; web CI green.
- Desktop PR open: Mood section logs + shows the trend strip; Deck routes it via `sectionView()`; `parity.json` mood=full + builtAgainstManifest 1.0.2; desktop v0.2.3.
- `pnpm build` clean; `pnpm test` green (adds mood, Mood, Deck Mood-routing); parity valid.
- No new code comments; commits conventional + trailered.
- **Merge order:** web manifest PR first, then desktop PR. `v0.2.3` tag is Austin's to push.
