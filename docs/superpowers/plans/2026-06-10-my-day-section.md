# My Day → full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Promote the `my-day` feature from `partial` to `full` by natively rendering the day-plan narrative + agenda timeline and today's wins in the Deck's Today section — all from data `GET /api/agent/context` already returns. No new web endpoints.

**Architecture:** Today section gains an `Agenda` block (narrative + a typed timeline of day-plan blocks with a "you-are-here" now marker) and a `Wins` block (today's achievements), both fed from `context.dayPlan` and `context.achievementsToday`. Pure helpers (`parseHm`, `blockIsNow`, `blockTone`) are unit-tested; components get render tests. Two PRs: a tiny web manifest flip (source of truth) then the desktop section.

**Tech Stack:** React 19, Tailwind v4, lucide-react, Vitest + Testing Library, TypeScript strict. Design within the established warm-dark Identity Anchor (Fraunces/Hanken/JetBrains, amber `--primary`, mint, `accent-rule`/`glow-amber` utilities, `tnum`).

---

## File structure

- **Web repo** (`/home/austin/development/personal/Personal Dashboard`): modify `features.json` only (manifest flip + version).
- Modify `src/lib/agent.ts` — add `DayBlock` type; type `dayPlan.blocks` as `DayBlock[]`.
- Create `src/lib/day-plan.ts` (+ `.test.ts`) — pure helpers: `parseHm`, `blockIsNow`, `blockTone`.
- Create `src/windows/sections/Agenda.tsx` (+ `.test.tsx`) — narrative + timeline.
- Create `src/windows/sections/Wins.tsx` (+ `.test.tsx`) — today's achievements.
- Modify `src/windows/sections/Today.tsx` — compose Agenda + Wins into the section.
- Modify `parity.json` — `my-day` → `full`, `builtAgainstManifest` → `1.0.1`.
- Modify `package.json` + `src-tauri/tauri.conf.json` — desktop version `0.2.1` → `0.2.2`.

---

## Task 1: Web manifest flip (web repo — separate branch + PR)

This is the source-of-truth half. Do it in the WEB repo at `/home/austin/development/personal/Personal Dashboard`.

**Files:** Modify `features.json`.

- [ ] **Step 1: Branch the web repo**

```bash
cd "/home/austin/development/personal/Personal Dashboard"
git checkout main && git pull --ff-only
git checkout -b chore/manifest-my-day-desktop-full
```

- [ ] **Step 2: Edit `features.json`** — two changes only:
  1. Top: `"manifestVersion": "1.0.0"` → `"manifestVersion": "1.0.1"`.
  2. In the `my-day` feature object: `"platforms": { "web": "full", "desktop": "partial" }` → `"platforms": { "web": "full", "desktop": "full" }`.
  Leave the `"updated"` field and everything else unchanged.

- [ ] **Step 3: Verify the manifest still matches the codebase**

Run: `node scripts/parity-check.mjs`
Expected: `parity OK — manifest matches the web codebase.` and the summary line now reads `desktop full 1/13`.

- [ ] **Step 4: Commit + push + PR**

```bash
git add features.json
git commit -m "chore(parity): mark my-day desktop=full, bump manifest 1.0.1

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
git push -u origin chore/manifest-my-day-desktop-full
gh pr create --base main --head chore/manifest-my-day-desktop-full \
  --title "chore(parity): my-day desktop=full (manifest 1.0.1)" \
  --body "Desktop natively ships My Day as of the companion increment. Metadata-only flip + manifest PATCH bump; no app code, so APP_VERSION is unchanged."
```
Note: web CI `parity` runs — it passes because `features.json` was touched (bump-enforcement satisfied) and the codebase is unchanged.

---

## Task 2: Type the day-plan blocks (desktop)

**Files:** Modify `src/lib/agent.ts`. (You are on branch `feat/my-day-section` in the desktop repo for all remaining tasks.)

- [ ] **Step 1: Add the `DayBlock` type and use it in `AgentContext`**

In `src/lib/agent.ts`, add this interface immediately above `export interface AgentContext {`:
```ts
export interface DayBlock {
  start: string;
  end: string | null;
  title: string;
  type: 'event' | 'focus' | 'break' | 'task' | 'admin';
  note: string | null;
  taskId: number | null;
}
```
Then, in `AgentContext`, replace the `dayPlan` line:
```ts
  dayPlan: { planDate: string; narrative: string | null; blocks: unknown[] } | null;
```
with:
```ts
  dayPlan: { planDate: string; narrative: string | null; blocks: DayBlock[] } | null;
```

- [ ] **Step 2: Typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no consumer currently reads `blocks`, so no breakage).

- [ ] **Step 3: Commit**

```bash
git add src/lib/agent.ts
git commit -m "feat(my-day): type day-plan blocks in the agent context

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: Day-plan helpers (TDD)

**Files:** Create `src/lib/day-plan.ts`; create `src/lib/day-plan.test.ts`.

- [ ] **Step 1: Write the failing test** `src/lib/day-plan.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import type { DayBlock } from '@/lib/agent';
import { blockIsNow, blockTone, parseHm } from '@/lib/day-plan';

const block = (over: Partial<DayBlock>): DayBlock => ({
  start: '09:00',
  end: '10:00',
  title: 'Focus',
  type: 'focus',
  note: null,
  taskId: null,
  ...over,
});

describe('parseHm', () => {
  it('parses HH:MM to minutes', () => {
    expect(parseHm('09:30')).toBe(570);
    expect(parseHm('00:00')).toBe(0);
    expect(parseHm('23:59')).toBe(1439);
  });
  it('returns null for junk or empty', () => {
    expect(parseHm('')).toBeNull();
    expect(parseHm(null)).toBeNull();
    expect(parseHm('nope')).toBeNull();
    expect(parseHm('25:00')).toBeNull();
  });
});

describe('blockIsNow', () => {
  it('is true only inside [start, end)', () => {
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 570)).toBe(true);
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 600)).toBe(false);
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 540)).toBe(true);
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 480)).toBe(false);
  });
  it('is false when end is missing or unparseable', () => {
    expect(blockIsNow(block({ start: '09:00', end: null }), 570)).toBe(false);
  });
});

describe('blockTone', () => {
  it('maps block types to tones', () => {
    expect(blockTone('focus')).toBe('focus');
    expect(blockTone('break')).toBe('break');
    expect(blockTone('event')).toBe('event');
    expect(blockTone('task')).toBe('muted');
    expect(blockTone('admin')).toBe('muted');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm test src/lib/day-plan.test.ts`
Expected: FAIL — cannot resolve `@/lib/day-plan`.

- [ ] **Step 3: Implement** `src/lib/day-plan.ts`:
```ts
import type { DayBlock } from '@/lib/agent';

export function parseHm(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function blockIsNow(block: DayBlock, nowMin: number): boolean {
  const start = parseHm(block.start);
  const end = parseHm(block.end);
  if (start == null || end == null) return false;
  return nowMin >= start && nowMin < end;
}

export type BlockTone = 'focus' | 'break' | 'event' | 'muted';

export function blockTone(type: DayBlock['type']): BlockTone {
  if (type === 'focus') return 'focus';
  if (type === 'break') return 'break';
  if (type === 'event') return 'event';
  return 'muted';
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `pnpm test src/lib/day-plan.test.ts`
Expected: PASS (3 describes, all green).

- [ ] **Step 5: Commit**

```bash
git add src/lib/day-plan.ts src/lib/day-plan.test.ts
git commit -m "feat(my-day): day-plan time + block-tone helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: The Agenda component (TDD)

**Files:** Create `src/windows/sections/Agenda.tsx`; create `src/windows/sections/Agenda.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Agenda.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DayBlock } from '@/lib/agent';
import { Agenda } from '@/windows/sections/Agenda';

const blocks: DayBlock[] = [
  { start: '09:00', end: '10:00', title: 'Ship the Deck', type: 'focus', note: null, taskId: null },
  { start: '14:00', end: '15:00', title: 'Call Zach', type: 'event', note: null, taskId: null },
];

describe('Agenda', () => {
  it('renders the narrative and each block title and start time', () => {
    render(<Agenda narrative="Deep-work morning." blocks={blocks} now={new Date(2020, 0, 1, 8, 0)} />);
    expect(screen.getByText('Deep-work morning.')).toBeInTheDocument();
    expect(screen.getByText('Ship the Deck')).toBeInTheDocument();
    expect(screen.getByText('Call Zach')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('marks the block that contains now', () => {
    render(<Agenda narrative={null} blocks={blocks} now={new Date(2020, 0, 1, 9, 30)} />);
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('does not mark any block when now is outside every block', () => {
    render(<Agenda narrative={null} blocks={blocks} now={new Date(2020, 0, 1, 12, 0)} />);
    expect(screen.queryByText('now')).not.toBeInTheDocument();
  });

  it('shows a quiet empty state when there is no plan', () => {
    render(<Agenda narrative={null} blocks={[]} now={new Date(2020, 0, 1, 9, 0)} />);
    expect(screen.getByText(/No plan set yet/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm test src/windows/sections/Agenda.test.tsx`
Expected: FAIL — cannot resolve `@/windows/sections/Agenda`.

- [ ] **Step 3: Implement** `src/windows/sections/Agenda.tsx`:
```tsx
import type { DayBlock } from '@/lib/agent';
import { type BlockTone, blockIsNow, blockTone } from '@/lib/day-plan';
import { cn } from '@/lib/cn';

const TONE: Record<BlockTone, string> = {
  focus: 'bg-primary',
  break: 'bg-mint',
  event: 'bg-foreground',
  muted: 'bg-muted-foreground',
};

export function Agenda({
  narrative,
  blocks,
  now = new Date(),
}: {
  narrative: string | null;
  blocks: DayBlock[];
  now?: Date;
}) {
  if (!narrative && blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No plan set yet — Jarvis or the dashboard builds one.</p>
    );
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="space-y-3">
      {narrative && (
        <p className="font-display text-base leading-snug text-foreground/90">{narrative}</p>
      )}
      {blocks.length > 0 && (
        <ul className="space-y-1">
          {blocks.map((b, i) => {
            const active = blockIsNow(b, nowMin);
            return (
              <li
                key={`${b.start}-${i}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
                  active && 'glow-amber bg-surface-2',
                )}
              >
                <span className="tnum w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {b.start}
                </span>
                <span className={cn('size-1.5 shrink-0 rounded-full', TONE[blockTone(b.type)])} />
                <span className="min-w-0 flex-1 truncate text-sm">{b.title}</span>
                {active && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                    now
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `pnpm test src/windows/sections/Agenda.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/windows/sections/Agenda.tsx src/windows/sections/Agenda.test.tsx
git commit -m "feat(my-day): agenda timeline with you-are-here marker

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: The Wins component (TDD)

**Files:** Create `src/windows/sections/Wins.tsx`; create `src/windows/sections/Wins.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Wins.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wins } from '@/windows/sections/Wins';

describe('Wins', () => {
  it('lists each win title', () => {
    render(
      <Wins
        wins={[
          { id: 1, title: 'Shipped parity system', achievedOn: '2026-06-10' },
          { id: 2, title: 'Cleared the deck', achievedOn: '2026-06-10' },
        ]}
      />,
    );
    expect(screen.getByText('Wins today')).toBeInTheDocument();
    expect(screen.getByText('Shipped parity system')).toBeInTheDocument();
    expect(screen.getByText('Cleared the deck')).toBeInTheDocument();
  });

  it('renders nothing when there are no wins', () => {
    render(<Wins wins={[]} />);
    expect(screen.queryByText('Wins today')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run it, confirm it fails**

Run: `pnpm test src/windows/sections/Wins.test.tsx`
Expected: FAIL — cannot resolve `@/windows/sections/Wins`.

- [ ] **Step 3: Implement** `src/windows/sections/Wins.tsx`:
```tsx
import { Sparkle } from 'lucide-react';

export function Wins({ wins }: { wins: { id: number; title: string; achievedOn: string }[] }) {
  if (wins.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <Sparkle className="size-3 text-mint" /> Wins today
      </p>
      {wins.map((w) => (
        <p key={w.id} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint" />
          <span className="min-w-0">{w.title}</span>
        </p>
      ))}
    </div>
  );
}
```

- [ ] **Step 4: Run it, confirm it passes**

Run: `pnpm test src/windows/sections/Wins.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/windows/sections/Wins.tsx src/windows/sections/Wins.test.tsx
git commit -m "feat(my-day): today's wins block

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 6: Compose Agenda + Wins into the Today section

**Files:** Modify `src/windows/sections/Today.tsx`.

The current Today renders (inside the non-error branch): the 2×2 tile grid, then the "Right now" card, then the open-tasks list / empty state. Add an Agenda block (with a divider + label) immediately after the tile grid, and a Wins block (with a divider) at the very end of the non-error content.

- [ ] **Step 1: Add the two imports**

In `src/windows/sections/Today.tsx`, add after the existing `import { ParityBanner } ...` line:
```tsx
import { Agenda } from '@/windows/sections/Agenda';
import { Wins } from '@/windows/sections/Wins';
```

- [ ] **Step 2: Insert the Agenda block after the tile grid**

Find the closing `</div>` of the tile grid (the `<div className="grid grid-cols-2 gap-2">` block — it ends right before the `{data?.now?.statement && (` line). Immediately AFTER that grid's closing `</div>` and BEFORE the `{data?.now?.statement && (` line, insert:
```tsx
            <div className="space-y-2">
              <div className="accent-rule" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today&apos;s shape
              </p>
              <Agenda
                narrative={data?.dayPlan?.narrative ?? null}
                blocks={data?.dayPlan?.blocks ?? []}
              />
            </div>
```

- [ ] **Step 3: Insert the Wins block at the end of the non-error content**

Find the empty-state line `{data && data.openTasks.length === 0 && !loading && (` … `)}` block. Immediately AFTER that block's closing `)}` and BEFORE the `</>` that closes the non-error fragment, insert:
```tsx
            {data && data.achievementsToday.length > 0 && (
              <div className="space-y-2">
                <div className="accent-rule" />
                <Wins wins={data.achievementsToday} />
              </div>
            )}
```

- [ ] **Step 4: Typecheck + the full suite**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc clean; all suites green (sections, Rail, Deck, day-plan, Agenda, Wins).

- [ ] **Step 5: Commit**

```bash
git add src/windows/sections/Today.tsx
git commit -m "feat(my-day): render agenda + wins in the Today section

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 7: Flip parity + bump desktop version

**Files:** Modify `parity.json`; `package.json`; `src-tauri/tauri.conf.json`.

- [ ] **Step 1: Flip `parity.json`** — two changes:
  1. `"builtAgainstManifest": "1.0.0"` → `"builtAgainstManifest": "1.0.1"`.
  2. `"my-day": "partial"` → `"my-day": "full"`.

- [ ] **Step 2: Bump the desktop version** to `0.2.2`:
  - In `package.json`: `"version": "0.2.1"` → `"version": "0.2.2"`.
  - In `src-tauri/tauri.conf.json`: if there is a top-level `"version"` field, change it from `0.2.1` to `0.2.2`. If the file has NO `version` field (Tauri reads it from package.json), leave it. Confirm with: `grep -n '"version"' src-tauri/tauri.conf.json`.

- [ ] **Step 3: Validate parity + JSON**

Run: `node scripts/parity-check.mjs`
Expected: `parity.json valid.` (the cross-check against the live manifest is skipped if unreachable; that's fine).
Run: `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('json ok')"`
Expected: `json ok`.

- [ ] **Step 4: Commit**

```bash
git add parity.json package.json src-tauri/tauri.conf.json
git commit -m "chore(parity): my-day full, builtAgainstManifest 1.0.1, v0.2.2

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 8: Whole-build verification + desktop PR

**Files:** none (verification + PR).

- [ ] **Step 1: Build + test + parity**

Run: `pnpm build && pnpm test && node scripts/parity-check.mjs`
Expected: build clean; all tests green; `parity.json valid`.

- [ ] **Step 2: Manual smoke (browser)**

Run `pnpm dev`, open `http://localhost:1420/?w=glance`. The Today section shows the new "Today's shape" agenda area (empty-state text if no live plan) and — when achievements exist — a Wins block. Rail still routes. Stop the dev server.

- [ ] **Step 3: Push + open the desktop PR** (after the web Task 1 PR is open)

```bash
git push -u origin feat/my-day-section
gh pr create --base main --head feat/my-day-section \
  --title "feat(my-day): native My Day — agenda timeline + wins (parity full)" \
  --body "Increment 2 of feature-max. Promotes my-day partial→full: renders day-plan narrative + a typed agenda timeline with a now marker, plus today's wins, all from /api/agent/context (no new web endpoints). Flips parity.json my-day=full + builtAgainstManifest 1.0.1; desktop v0.2.2. Pairs with web PR chore/manifest-my-day-desktop-full (merge that first). New tests: day-plan helpers, Agenda, Wins."
```

---

## Definition of done

- Web PR open: `features.json` manifest 1.0.1 + my-day desktop=full; web CI green.
- Desktop PR open: Agenda + Wins render in Today; `parity.json` my-day=full + builtAgainstManifest 1.0.1; desktop v0.2.2.
- `pnpm build` clean; `pnpm test` green (adds day-plan, Agenda, Wins suites); `node scripts/parity-check.mjs` valid.
- No code comments; all commits conventional + trailered.
- **Merge order:** web manifest PR first, then desktop PR. Desktop release tag (v0.2.2) is Austin's to push.
