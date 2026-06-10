# Habits → full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promote `habits` partial→full. The web context route gains a per-habit `streak` (reusing the existing streak logic, extracted to a shared module); the desktop gets a Habits section that lists active habits with a check-in toggle and the streak.

**Architecture:** This is the first increment that changes live web app code. Web: extract `computeStreak` to `src/lib/habits.ts`, reuse it in `habits-client.tsx` (behavior-preserving) and in the context route, and widen the checkin window from 1 day to 365 so the streak can be computed. Desktop: a new `checkInHabit` agent method + a Habits section (toggle = POST `habit-checkin`), wired via `sectionView()`. Two PRs: web (real code) then desktop.

**Tech Stack:** Web = Next.js App Router + Drizzle + date-fns (no test harness — verify via `next build` + biome + parity-check). Desktop = React 19 + Vitest + Tailwind, warm-dark Identity Anchor (mint=done, amber=streak flame).

---

## WEB half (repo `/home/austin/development/personal/Personal Dashboard`, branch `feat/habits-context-streak`)

Executed by the controller inline (sensitive live-app code). Steps documented for the record.

1. **Create `src/lib/habits.ts`** — move `computeStreak` verbatim out of `habits-client.tsx`:
```ts
import { addDays, format, parseISO } from 'date-fns';
import { todayIso } from '@/lib/date';

export function computeStreak(doneSet: Set<string>): number {
  const today = todayIso();
  let cursor = parseISO(today);
  if (!doneSet.has(today)) cursor = addDays(cursor, -1);
  let streak = 0;
  while (doneSet.has(format(cursor, 'yyyy-MM-dd'))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
```
2. **`src/components/features/habits-client.tsx`** — delete the local `computeStreak` function; add `import { computeStreak } from '@/lib/habits';` (keep the existing `date-fns` import — `gridDates` still uses it).
3. **`src/app/api/agent/context/route.ts`** — add `import { computeStreak } from '@/lib/habits';`; change `habitRepo.listWithCheckins(1)` → `habitRepo.listWithCheckins(365)`; add to each mapped habit:
   `streak: computeStreak(new Set(h.checkins.filter((c) => c.done).map((c) => c.on))),`
4. **`features.json`** — `manifestVersion` 1.0.2 → 1.0.3; `habits` `platforms.desktop` partial → full.
5. **`package.json`** — `version` 0.1.0 → 0.1.1 (real code change → product PATCH bump).
6. Verify: `node scripts/parity-check.mjs` (→ `desktop full 3/13`); `pnpm build` (next build clean); `pnpm lint` (biome clean). Commit, push, PR.

---

## Task D1: Desktop agent — streak field + checkInHabit (desktop repo, branch `feat/habits-section`)

**Files:** Modify `src/lib/agent.ts`.

- [ ] **Step 1: Add `streak` to `HabitSummary`.** Change the interface to:
```ts
export interface HabitSummary {
  id: number;
  name: string;
  cadence: string;
  target: number | null;
  doneToday: boolean;
  streak: number;
}
```

- [ ] **Step 2: Add an input type + method.** Above `export class AgentError`, add:
```ts
export interface HabitCheckinInput {
  habitId: number;
  done: boolean;
}
```
In the `agent` object (after `addHighlight`), add:
```ts
  checkInHabit: (input: HabitCheckinInput) =>
    request<unknown>('/api/agent/habit-checkin', { method: 'POST', body: input }),
```

- [ ] **Step 3: Typecheck.** Run `pnpm exec tsc --noEmit`. Expected: PASS. (Existing `context.habits` consumers — the Today tiles — only read `doneToday`, so adding `streak` to the type is safe.)

- [ ] **Step 4: Commit.**
```bash
git add src/lib/agent.ts
git commit -m "feat(habits): habit streak field + checkInHabit agent method

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D2: The Habits section (TDD)

**Files:** Create `src/windows/sections/Habits.tsx`; create `src/windows/sections/Habits.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Habits.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type HabitSummary } from '@/lib/agent';

const habits: HabitSummary[] = [
  { id: 1, name: 'Read', cadence: 'daily', target: null, doneToday: false, streak: 4 },
  { id: 2, name: 'Stretch', cadence: 'daily', target: null, doneToday: true, streak: 9 },
];

vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({
    data: { habits },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { Habits } from '@/windows/sections/Habits';

describe('Habits', () => {
  it('lists habits with their streak and the done count', () => {
    render(<Habits />);
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('checks in a not-yet-done habit', async () => {
    const spy = vi.spyOn(agent, 'checkInHabit').mockResolvedValue({});
    render(<Habits />);
    await userEvent.click(screen.getByRole('button', { name: /Read/ }));
    expect(spy).toHaveBeenCalledWith({ habitId: 1, done: true });
  });

  it('un-checks an already-done habit', async () => {
    const spy = vi.spyOn(agent, 'checkInHabit').mockResolvedValue({});
    render(<Habits />);
    await userEvent.click(screen.getByRole('button', { name: /Stretch/ }));
    expect(spy).toHaveBeenCalledWith({ habitId: 2, done: false });
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `pnpm test src/windows/sections/Habits.test.tsx` → cannot resolve `@/windows/sections/Habits`.

- [ ] **Step 3: Implement** `src/windows/sections/Habits.tsx`:
```tsx
import { Check, Flame } from 'lucide-react';
import { useState } from 'react';
import { agent } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { useAgentContext } from '@/lib/use-context';

export function Habits() {
  const { data, refresh } = useAgentContext();
  const [pending, setPending] = useState<number | null>(null);
  const habits = data?.habits ?? [];
  const doneCount = habits.filter((h) => h.doneToday).length;

  async function toggle(id: number, doneToday: boolean) {
    setPending(id);
    try {
      await agent.checkInHabit({ habitId: id, done: !doneToday });
      await refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Today</p>
          <h1 className="font-display text-xl tracking-tight">
            Habits
            {habits.length > 0 && (
              <span className="text-muted-foreground">
                {' '}
                · {doneCount}/{habits.length}
              </span>
            )}
          </h1>
        </header>

        {habits.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No habits yet — add one on the dashboard to start a streak.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {habits.map((h) => (
              <li key={h.id}>
                <button
                  type="button"
                  disabled={pending === h.id}
                  onClick={() => void toggle(h.id, h.doneToday)}
                  aria-pressed={h.doneToday}
                  className={cn(
                    'no-drag flex w-full items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors disabled:opacity-50',
                    h.doneToday
                      ? 'border-mint/30 bg-mint/10'
                      : 'border-border bg-card hover:bg-accent',
                  )}
                >
                  <span
                    className={cn(
                      'grid size-5 shrink-0 place-items-center rounded-full border transition-colors',
                      h.doneToday
                        ? 'border-mint bg-mint text-mint-foreground'
                        : 'border-border-strong',
                    )}
                  >
                    {h.doneToday && <Check className="size-3.5" />}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm">{h.name}</span>
                  {h.streak > 0 && (
                    <span className="flex shrink-0 items-center gap-1 font-mono text-xs text-primary">
                      <Flame className="size-3.5" /> {h.streak}
                    </span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it, confirm it passes** — `pnpm test src/windows/sections/Habits.test.tsx` (3 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/windows/sections/Habits.tsx src/windows/sections/Habits.test.tsx
git commit -m "feat(habits): native Habits section — check-in toggle + streak

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D3: Wire Habits into the Deck

**Files:** Modify `src/windows/Deck.tsx`; modify `src/windows/Deck.test.tsx`.

- [ ] **Step 1: Add the import + case.** In `src/windows/Deck.tsx`, add `import { Habits } from '@/windows/sections/Habits';` (after the `Mood` import), and add a case to `sectionView` before `default`:
```tsx
    case 'habits':
      return <Habits />;
```

- [ ] **Step 2: Add a routing test.** In `src/windows/Deck.test.tsx`, the existing mocks (`@/lib/use-context`, `@/lib/bootstrap`, banners) already cover Habits. Add inside `describe('Deck', …)`:
```tsx
  it('renders the Habits section when Habits is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Habits' }));
    expect(screen.getByRole('heading', { name: /Habits/ })).toBeInTheDocument();
  });
```

- [ ] **Step 3: Typecheck + full suite** — `pnpm exec tsc --noEmit && pnpm test` (all green, incl. new Habits + routing).

- [ ] **Step 4: Commit.**
```bash
git add src/windows/Deck.tsx src/windows/Deck.test.tsx
git commit -m "feat(habits): route the Habits section in the Deck

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D4: Flip parity + bump version

**Files:** `parity.json`, `package.json`, `src-tauri/tauri.conf.json`.

- [ ] **Step 1:** `parity.json` — `builtAgainstManifest` 1.0.2 → 1.0.3; `habits` partial → full.
- [ ] **Step 2:** version 0.2.3 → 0.2.4 in `package.json` and `src-tauri/tauri.conf.json`.
- [ ] **Step 3:** Validate — `node scripts/parity-check.mjs` (`parity.json valid.`); `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'));console.log('json ok')"`.
- [ ] **Step 4: Commit.**
```bash
git add parity.json package.json src-tauri/tauri.conf.json
git commit -m "chore(parity): habits full, builtAgainstManifest 1.0.3, v0.2.4

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D5: Verification + desktop PR

- [ ] **Step 1:** `pnpm build && pnpm test && node scripts/parity-check.mjs` — all green.
- [ ] **Step 2:** Manual smoke: `pnpm dev`, open `?w=glance`, click **Habits** — list renders, toggling a row flips the check + (against live data) re-fetches; streak flame shows for streaked habits.
- [ ] **Step 3:** Push + PR (after the web PR is open):
```bash
git push -u origin feat/habits-section
gh pr create --base main --head feat/habits-section \
  --title "feat(habits): native Habits section — check-in toggle + streak (parity full)" \
  --body "Increment 4 of feature-max. Promotes habits partial→full: a Habits section listing active habits with a one-tap check-in toggle (POST habit-checkin) and the current streak. Reads the new context.habits[].streak. Adds the checkInHabit agent method. Flips parity.json habits=full + builtAgainstManifest 1.0.3; desktop v0.2.4. Pairs with web PR feat/habits-context-streak (streak in the context route; merge first). New tests: Habits section, Deck routing."
```

---

## Definition of done

- Web PR open + green: shared `computeStreak`, context `habits[].streak`, manifest 1.0.3, habits desktop=full, web v0.1.1.
- Desktop PR open: Habits section toggles + shows streak; `parity.json` habits=full + builtAgainstManifest 1.0.3; desktop v0.2.4.
- `pnpm build`/`pnpm test` green (desktop); `next build` + biome + parity-check green (web).
- No new code comments; commits conventional + trailered.
- **Merge order:** web PR first, then desktop. `v0.2.4` tag is Austin's to push.
