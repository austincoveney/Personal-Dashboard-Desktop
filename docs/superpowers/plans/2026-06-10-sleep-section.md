# Sleep → full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promote `sleep` partial→full. Web gains agent-authed `GET /api/agent/sleep?limit=N` (recent history) and `DELETE /api/agent/sleep/:id`; desktop gets a Sleep section that logs a night (computing duration with the 19h-mixup fix), shows recent nights, and deletes them. Editing is re-logging (the POST upserts by date).

**Architecture:** Web adds a GET handler to the existing agent sleep route and a new `[id]` DELETE route (both `requireAgent`), reusing `sleepRepo.list`/`remove`. Desktop adds `getSleepHistory`/`deleteSleep` methods + a `sleepDuration` helper (mirrors the merged web fix, reusing `parseHm` from `@/lib/day-plan`) + a Sleep section wired via `sectionView()`. Two PRs: web then desktop.

**Tech Stack:** Web = Next.js + Drizzle (`sleepRepo.list(limit)`, `remove(id)`), verified via `next build` + biome. Desktop = React 19 + Vitest + Tailwind, warm-dark Identity Anchor.

---

## WEB half (repo `/home/austin/development/personal/Personal Dashboard`, branch `feat/agent-sleep-read-delete`)

Executed by the controller inline.

1. **Add `GET` to `src/app/api/agent/sleep/route.ts`** (keep the existing POST; add `ok` to the import from `@/lib/api`):
```ts
export function GET(request: NextRequest) {
  const denied = requireAgent(request);
  if (denied) return denied;
  return route(async () => {
    const raw = Number(new URL(request.url).searchParams.get('limit'));
    const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 90) : 14;
    return ok(await sleepRepo.list(limit));
  });
}
```
2. **Create `src/app/api/agent/sleep/[id]/route.ts`** (agent-authed DELETE):
```ts
import type { NextRequest } from 'next/server';
import { sleepRepo } from '@/db/repos';
import { requireAgent } from '@/lib/agent-auth';
import { fail, ok, parseId, route } from '@/lib/api';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAgent(request);
  if (denied) return denied;
  return route(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) return fail('Invalid id', 400);
    const removed = await sleepRepo.remove(numId);
    if (!removed) return fail('Not found', 404);
    return ok(removed);
  });
}
```
3. **`features.json`**: `manifestVersion` 1.0.4 → 1.0.5; `sleep` `platforms.desktop` partial → full.
4. **`package.json`**: 0.1.2 → 0.1.3.
5. Verify: `node scripts/parity-check.mjs` (→ `desktop full 5/13`); `pnpm build`; biome on the two files. Commit, push, PR.

---

## Task D1: Desktop agent — sleep history + delete (branch `feat/sleep-section`)

**Files:** Modify `src/lib/agent.ts`.

- [ ] **Step 1:** Add two methods to the `agent` object (after `logSleep`):
```ts
  getSleepHistory: (limit = 14) => request<SleepSummary[]>(`/api/agent/sleep?limit=${limit}`),
  deleteSleep: (id: number) => request<unknown>(`/api/agent/sleep/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 2:** `pnpm exec tsc --noEmit` (PASS — `SleepSummary` is already defined and exported).

- [ ] **Step 3: Commit.**
```bash
git add src/lib/agent.ts
git commit -m "feat(sleep): sleep history + delete agent methods

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D2: Sleep duration + date helpers (TDD)

**Files:** Create `src/lib/sleep.ts`; create `src/lib/sleep.test.ts`.

- [ ] **Step 1: Write the failing test** `src/lib/sleep.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { shortNight, sleepDuration } from '@/lib/sleep';

describe('sleepDuration', () => {
  it('computes a normal overnight span', () => {
    expect(sleepDuration('23:00', '07:00')).toBe(480);
    expect(sleepDuration('22:30', '06:00')).toBe(450);
  });
  it('corrects the 12:00-means-midnight mixup (no phantom 19h night)', () => {
    expect(sleepDuration('12:00', '07:00')).toBe(420);
  });
  it('returns null for unparseable times', () => {
    expect(sleepDuration('', '07:00')).toBeNull();
    expect(sleepDuration('23:00', 'nope')).toBeNull();
  });
});

describe('shortNight', () => {
  it('formats an iso date to a short weekday+day', () => {
    expect(shortNight('2026-06-10')).toMatch(/\d/);
  });
  it('returns the input when it is not a valid iso date', () => {
    expect(shortNight('garbage')).toBe('garbage');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `pnpm test src/lib/sleep.test.ts`.

- [ ] **Step 3: Implement** `src/lib/sleep.ts`:
```ts
import { parseHm } from '@/lib/day-plan';

const DAY = 1440;

export function sleepDuration(bedtime: string, wakeTime: string): number | null {
  const bed = parseHm(bedtime);
  const wake = parseHm(wakeTime);
  if (bed == null || wake == null) return null;
  let dur = (wake - bed + DAY) % DAY;
  if (dur > 14 * 60) {
    const flipped = (wake - ((bed + 12 * 60) % DAY) + DAY) % DAY;
    if (flipped <= 14 * 60) dur = flipped;
  }
  return dur;
}

export function shortNight(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}
```

- [ ] **Step 4: Run it, confirm it passes** — `pnpm test src/lib/sleep.test.ts`.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/sleep.ts src/lib/sleep.test.ts
git commit -m "feat(sleep): duration (with 19h-mixup fix) + night-label helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D3: The Sleep section (TDD)

**Files:** Create `src/windows/sections/Sleep.tsx`; create `src/windows/sections/Sleep.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Sleep.test.tsx`:
```tsx
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type SleepSummary } from '@/lib/agent';

const history: SleepSummary[] = [
  { id: 7, on: '2026-06-10', bedtime: '23:00', wakeTime: '07:00', asleepMin: 480, quality: 4, note: null, source: 'self' },
];

describe('Sleep', () => {
  it('shows recent nights from history', async () => {
    vi.spyOn(agent, 'getSleepHistory').mockResolvedValue(history);
    const { Sleep } = await import('@/windows/sections/Sleep');
    render(<Sleep />);
    expect(await screen.findByText('8h')).toBeInTheDocument();
  });

  it('logs a night with the computed duration', async () => {
    vi.spyOn(agent, 'getSleepHistory').mockResolvedValue([]);
    const log = vi.spyOn(agent, 'logSleep').mockResolvedValue({});
    const { Sleep } = await import('@/windows/sections/Sleep');
    render(<Sleep />);
    fireEvent.change(screen.getByLabelText('Bedtime'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('Wake time'), { target: { value: '07:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Quality 4' }));
    await userEvent.click(screen.getByRole('button', { name: /Log sleep/i }));
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ bedtime: '23:00', wakeTime: '07:00', asleepMin: 480, quality: 4 }),
    );
  });

  it('deletes a night', async () => {
    vi.spyOn(agent, 'getSleepHistory').mockResolvedValue(history);
    const del = vi.spyOn(agent, 'deleteSleep').mockResolvedValue({});
    const { Sleep } = await import('@/windows/sections/Sleep');
    render(<Sleep />);
    await screen.findByText('8h');
    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(del).toHaveBeenCalledWith(7));
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `pnpm test src/windows/sections/Sleep.test.tsx`.

- [ ] **Step 3: Implement** `src/windows/sections/Sleep.tsx`:
```tsx
import { Check, Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { agent, type SleepSummary } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { fmtDur, todayIso } from '@/lib/format';
import { shortNight, sleepDuration } from '@/lib/sleep';

const QUALITY = [1, 2, 3, 4, 5];

export function Sleep() {
  const [bedtime, setBedtime] = useState('');
  const [wakeTime, setWakeTime] = useState('');
  const [quality, setQuality] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [history, setHistory] = useState<SleepSummary[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setHistory(await agent.getSleepHistory(14));
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load history');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  const preview = bedtime && wakeTime ? sleepDuration(bedtime, wakeTime) : null;

  async function save() {
    if (!bedtime || !wakeTime) return;
    setBusy(true);
    setErr(null);
    try {
      await agent.logSleep({
        on: todayIso(),
        bedtime,
        wakeTime,
        asleepMin: sleepDuration(bedtime, wakeTime) ?? undefined,
        quality: quality ?? undefined,
        note: note.trim() || undefined,
      });
      setNote('');
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setErr(null);
    try {
      await agent.deleteSleep(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete');
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Last night</p>
          <h1 className="font-display text-xl tracking-tight">Log sleep</h1>
        </header>

        <div className="grid grid-cols-2 gap-2">
          <label className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Bedtime</span>
            <input
              type="time"
              aria-label="Bedtime"
              value={bedtime}
              onChange={(e) => setBedtime(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-surface/50 px-2 text-sm outline-none focus:border-border-strong"
            />
          </label>
          <label className="space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">Wake time</span>
            <input
              type="time"
              aria-label="Wake time"
              value={wakeTime}
              onChange={(e) => setWakeTime(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-surface/50 px-2 text-sm outline-none focus:border-border-strong"
            />
          </label>
        </div>

        <div className="flex items-center gap-1.5">
          {QUALITY.map((q) => (
            <button
              key={q}
              type="button"
              onClick={() => setQuality(q)}
              aria-label={`Quality ${q}`}
              className={cn(
                'no-drag h-8 flex-1 rounded-md text-xs font-medium transition-colors',
                quality === q ? 'bg-primary/20 text-primary' : 'bg-surface-2 text-muted-foreground hover:text-foreground',
              )}
            >
              {q}
            </button>
          ))}
        </div>

        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Any notes? (optional)"
          className="h-9 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
        />

        {err && <p className="text-xs text-destructive">{err}</p>}

        <Button onClick={save} disabled={busy || !bedtime || !wakeTime} size="sm" className="w-full">
          <Check className="size-3.5" />
          {busy ? 'Saving…' : preview != null ? `Log sleep · ${fmtDur(preview)}` : 'Log sleep'}
        </Button>

        <div className="accent-rule" />

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">No nights logged yet.</p>
        ) : (
          <ul className="space-y-1">
            {history.map((s) => (
              <li key={s.id} className="group flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
                <span className="tnum w-12 shrink-0 font-mono text-[11px] text-muted-foreground">{shortNight(s.on)}</span>
                <span className="flex-1 text-sm">{fmtDur(s.asleepMin)}</span>
                {s.quality != null && (
                  <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{s.quality}/5</span>
                )}
                <button
                  type="button"
                  onClick={() => void remove(s.id)}
                  aria-label={`Delete ${shortNight(s.on)}`}
                  className="no-drag shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                >
                  <Trash2 className="size-3.5" />
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

- [ ] **Step 4: Run it, confirm it passes** — `pnpm test src/windows/sections/Sleep.test.tsx` (3 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/windows/sections/Sleep.tsx src/windows/sections/Sleep.test.tsx
git commit -m "feat(sleep): native Sleep section — log + recent history + delete

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D4: Wire Sleep into the Deck

**Files:** Modify `src/windows/Deck.tsx`; modify `src/windows/Deck.test.tsx`.

- [ ] **Step 1:** In `src/windows/Deck.tsx` add `import { Sleep } from '@/windows/sections/Sleep';` (after the `Tasks` import) and a case before `default`:
```tsx
    case 'sleep':
      return <Sleep />;
```

- [ ] **Step 2:** Add to `src/windows/Deck.test.tsx` inside `describe('Deck', …)`:
```tsx
  it('renders the Sleep section when Sleep is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(screen.getByRole('heading', { name: 'Log sleep' })).toBeInTheDocument();
  });
```
No extra mock is needed: `Sleep` calls `agent.getSleepHistory` on mount, which in the test env throws immediately (`AgentError('No agent token')` — there is no network call) and the section's `load()` catches it. The "Log sleep" heading renders regardless, so the assertion holds. Do NOT add any new mock for this test.

- [ ] **Step 3:** `pnpm exec tsc --noEmit && pnpm test` — all green.

- [ ] **Step 4: Commit.**
```bash
git add src/windows/Deck.tsx src/windows/Deck.test.tsx
git commit -m "feat(sleep): route the Sleep section in the Deck

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D5: Flip parity + bump version

**Files:** `parity.json`, `package.json`, `src-tauri/tauri.conf.json`.

- [ ] **Step 1:** `parity.json` — `builtAgainstManifest` 1.0.4 → 1.0.5; `sleep` partial → full.
- [ ] **Step 2:** version 0.2.5 → 0.2.6 in `package.json` and `src-tauri/tauri.conf.json`.
- [ ] **Step 3:** `node scripts/parity-check.mjs` (`parity.json valid.`); validate the tauri JSON.
- [ ] **Step 4: Commit.**
```bash
git add parity.json package.json src-tauri/tauri.conf.json
git commit -m "chore(parity): sleep full, builtAgainstManifest 1.0.5, v0.2.6

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D6: Verification + desktop PR

- [ ] **Step 1:** `pnpm build && pnpm test && node scripts/parity-check.mjs` — all green.
- [ ] **Step 2:** Manual smoke: `pnpm dev`, `?w=glance`, click **Sleep** — log a night (duration preview updates), see it in history, delete it.
- [ ] **Step 3:** Push + PR (after the web PR is open):
```bash
git push -u origin feat/sleep-section
gh pr create --base main --head feat/sleep-section \
  --title "feat(sleep): native Sleep section — log + history + delete (parity full)" \
  --body "Increment 6 of feature-max. Promotes sleep partial→full: a Sleep section that logs a night (bedtime/wake → duration via the 19h-mixup fix, quality, note), shows recent nights, and deletes them. New agent getSleepHistory/deleteSleep (GET /api/agent/sleep?limit=N, DELETE /api/agent/sleep/:id). Editing = re-log (POST upserts by date). Flips parity.json sleep=full + builtAgainstManifest 1.0.5; desktop v0.2.6. Pairs with web PR feat/agent-sleep-read-delete (merge first). New tests: sleep helpers, Sleep section, Deck routing."
```

---

## Definition of done

- Web PR open + green: agent `GET`/`DELETE` for sleep, manifest 1.0.5, sleep desktop=full, web v0.1.3.
- Desktop PR open: Sleep section (log + history + delete); `parity.json` sleep=full + builtAgainstManifest 1.0.5; desktop v0.2.6.
- `pnpm build`/`pnpm test` green; web `next build` + biome + parity-check green.
- No new code comments; commits conventional + trailered.
- **Merge order:** web PR first, then desktop. `v0.2.6` tag is Austin's to push.
