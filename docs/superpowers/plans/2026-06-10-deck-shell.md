# Deck Shell Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the single-view `glance` tray window into a "Deck" main window with a left icon-rail that routes between a **Today** section (the current glance content) and six placeholder feature sections — the frame every feature increment will fill in.

**Architecture:** One Tauri window (label stays `glance`), React-state section routing (no new windows). A typed `SECTIONS` model drives both the rail and the content switch. The current Glance body moves verbatim into `sections/Today.tsx`; six sections start as labelled placeholders. No web/API changes, no `parity.json` flips — this is scaffolding only.

**Tech Stack:** Tauri v2, React 19, Vite 6, Tailwind v4, lucide-react, TypeScript (strict, `verbatimModuleSyntax`). Adds Vitest + Testing Library as the project's first test harness.

---

## File structure

- Create `vitest.config.ts` — test runner config (jsdom, `@` alias, setup file).
- Create `src/test/setup.ts` — jest-dom matchers.
- Create `src/lib/sections.ts` — `SectionId` type, `SECTIONS` list, `isSectionId` guard. One responsibility: the nav model.
- Create `src/lib/sections.test.ts` — unit tests for the guard/model.
- Create `src/components/Rail.tsx` — the left icon-rail (presentational + click handler). One responsibility: render nav + emit selection.
- Create `src/windows/sections/Today.tsx` — the current Glance body, unchanged behaviour.
- Create `src/windows/sections/Placeholder.tsx` — one reusable "coming soon" section body.
- Create `src/windows/Deck.tsx` — the shell: TitleBar + Rail + active-section switch. Registers shortcuts once.
- Create `src/windows/Deck.test.tsx` — routing behaviour test.
- Modify `src/App.tsx` — render `<Deck/>` for the default screen instead of `<Glance/>`.
- Delete `src/windows/Glance.tsx` — its body now lives in `sections/Today.tsx`.
- Modify `src-tauri/tauri.conf.json:18-30` — widen the `glance` window to Deck size.
- Modify `package.json:8-15` — add a `test` script.

---

## Task 1: Stand up the Vitest harness

**Files:**
- Modify: `package.json:8-15` (scripts) and devDependencies
- Create: `vitest.config.ts`
- Create: `src/test/setup.ts`

- [ ] **Step 1: Install dev dependencies**

Run:
```bash
cd "/home/austin/development/personal/Personal-Dashboard-Desktop"
pnpm add -D vitest jsdom @testing-library/react @testing-library/dom @testing-library/jest-dom @testing-library/user-event
```
Expected: pnpm adds the packages; no `esbuild` approval prompt (already allowed in `pnpm-workspace.yaml`).

- [ ] **Step 2: Create the Vitest config**

Create `vitest.config.ts`:
```ts
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
});
```

- [ ] **Step 3: Create the test setup file**

Create `src/test/setup.ts`:
```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Add the test script**

In `package.json`, change the `scripts` block to add `test` (keep the rest as-is):
```json
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "test": "vitest run",
    "test:watch": "vitest",
    "preview": "vite preview",
    "tauri": "tauri",
    "tauri:dev": "tauri dev",
    "tauri:build": "tauri build"
  },
```

- [ ] **Step 5: Verify the runner starts (no tests yet)**

Run: `pnpm test`
Expected: Vitest runs and reports "No test files found" (exit non-zero is fine here) — confirms config loads without error.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/test/setup.ts
git commit -m "test: add vitest + testing-library harness"
```

---

## Task 2: The section nav model

**Files:**
- Create: `src/lib/sections.ts`
- Test: `src/lib/sections.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/sections.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { SECTIONS, isSectionId } from '@/lib/sections';

describe('sections model', () => {
  it('starts with Today and lists all seven sections in order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      'today',
      'mood',
      'tasks',
      'notes',
      'sleep',
      'habits',
      'life',
    ]);
  });

  it('gives every section a non-empty label and an icon', () => {
    for (const s of SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
      // lucide-react icons are forwardRef components (typeof === 'object'), not plain functions.
      expect(s.icon).toBeTruthy();
    }
  });

  it('guards known ids and rejects unknown ones', () => {
    expect(isSectionId('mood')).toBe(true);
    expect(isSectionId('today')).toBe(true);
    expect(isSectionId('journal')).toBe(false);
    expect(isSectionId('')).toBe(false);
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test src/lib/sections.test.ts`
Expected: FAIL — cannot resolve `@/lib/sections`.

- [ ] **Step 3: Implement the model**

Create `src/lib/sections.ts`:
```ts
import {
  BookHeart,
  CheckSquare,
  Home,
  type LucideIcon,
  Moon,
  NotebookPen,
  SmilePlus,
  Target,
} from 'lucide-react';

export type SectionId = 'today' | 'mood' | 'tasks' | 'notes' | 'sleep' | 'habits' | 'life';

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

export const SECTIONS: SectionDef[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'mood', label: 'Mood', icon: SmilePlus },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'habits', label: 'Habits', icon: Target },
  { id: 'life', label: 'Life', icon: BookHeart },
];

const IDS = new Set<string>(SECTIONS.map((s) => s.id));

export function isSectionId(value: string): value is SectionId {
  return IDS.has(value);
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test src/lib/sections.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/sections.ts src/lib/sections.test.ts
git commit -m "feat(deck): typed section nav model"
```

---

## Task 3: The icon rail

**Files:**
- Create: `src/components/Rail.tsx`
- Test: `src/components/Rail.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/Rail.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Rail } from '@/components/Rail';

describe('Rail', () => {
  it('renders a button per section and marks the active one', () => {
    render(<Rail active="mood" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mood' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Tasks' })).not.toHaveAttribute('aria-current');
  });

  it('emits the section id when a rail item is clicked', async () => {
    const onSelect = vi.fn();
    render(<Rail active="today" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(onSelect).toHaveBeenCalledWith('sleep');
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test src/components/Rail.test.tsx`
Expected: FAIL — cannot resolve `@/components/Rail`.

- [ ] **Step 3: Implement the rail**

Create `src/components/Rail.tsx`:
```tsx
import { SECTIONS, type SectionId } from '@/lib/sections';
import { cn } from '@/lib/cn';

export function Rail({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2"
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={label}
            title={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'no-drag grid size-9 place-items-center rounded-lg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              isActive
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test src/components/Rail.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/Rail.tsx src/components/Rail.test.tsx
git commit -m "feat(deck): left icon-rail component"
```

---

## Task 4: Extract the Today section

This is a pure move of the current Glance body into a section component, minus the window chrome (TitleBar) and the one-time `registerShortcuts` call, which both move up to the Deck shell in Task 6. Behaviour is unchanged.

**Files:**
- Create: `src/windows/sections/Today.tsx`

- [ ] **Step 1: Create the Today section**

Create `src/windows/sections/Today.tsx`:
```tsx
import {
  ExternalLink,
  HeartPulse,
  Moon,
  Plus,
  RefreshCw,
  Settings as SettingsIcon,
  Sparkles,
  Star,
  Target,
} from 'lucide-react';
import type { ComponentType } from 'react';
import { UpdateBanner } from '@/components/UpdateBanner';
import { ParityBanner } from '@/components/ParityBanner';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/cn';
import { fmtDur, greeting, longDate, moodLabel, moodTone } from '@/lib/format';
import { useAgentContext } from '@/lib/use-context';
import { openDashboard, showWindow } from '@/lib/win-actions';

function Tile({
  icon: Icon,
  label,
  value,
  hint,
  tone,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  value: string;
  hint?: string;
  tone?: string;
  accent: 'amber' | 'mint';
}) {
  return (
    <Card className="space-y-1 p-3">
      <Icon className={cn('size-4', accent === 'mint' ? 'text-mint' : 'text-primary')} />
      <p className={cn('font-display text-lg leading-tight', tone)}>{value}</p>
      <p className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      {hint && <p className="text-[11px] text-muted-foreground">{hint}</p>}
    </Card>
  );
}

export function Today() {
  const { data, error, loading, refresh } = useAgentContext(120_000);

  const focus = data?.openTasks.filter((t) => t.focus).length ?? 0;
  const open = data?.openTasks.length ?? 0;
  const habitsDone = data?.habits.filter((h) => h.doneToday).length ?? 0;
  const habitsTotal = data?.habits.length ?? 0;
  const mood = data?.latestMood ?? null;

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {longDate()}
          </p>
          <h1 className="font-display text-xl tracking-tight">{greeting()}, Austin.</h1>
        </header>

        <UpdateBanner />
        <ParityBanner />

        {error ? (
          <Card className="space-y-2 border-dashed p-4 text-center">
            <p className="text-sm text-muted-foreground">{error}</p>
            <Button size="sm" variant="secondary" onClick={() => showWindow('settings')}>
              <SettingsIcon className="size-3.5" /> Open settings
            </Button>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <Tile
                icon={HeartPulse}
                accent="amber"
                label="Mood"
                value={mood ? moodLabel(mood.valence, mood.energy) : '—'}
                tone={mood ? moodTone(mood.valence) : undefined}
                hint={mood?.source === 'jarvis' ? 'from Jarvis' : undefined}
              />
              <Tile
                icon={Moon}
                accent="mint"
                label="Last night"
                value={data?.latestSleep ? fmtDur(data.latestSleep.asleepMin) : '—'}
                hint={data?.latestSleep?.quality != null ? `${data.latestSleep.quality}/5` : 'log it'}
              />
              <Tile
                icon={Star}
                accent="amber"
                label="In focus"
                value={String(focus)}
                hint={`${open} open`}
              />
              <Tile
                icon={Target}
                accent="mint"
                label="Habits"
                value={habitsTotal > 0 ? `${habitsDone}/${habitsTotal}` : '—'}
                hint={habitsTotal > 0 ? 'today' : 'none yet'}
              />
            </div>

            {data?.now?.statement && (
              <Card className="space-y-1 p-3">
                <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
                  <Sparkles className="size-3 text-mint" /> Right now
                </p>
                <p className="text-sm text-foreground/90">{data.now.statement}</p>
              </Card>
            )}

            {data && data.openTasks.length > 0 && (
              <div className="space-y-1.5">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  Open tasks
                </p>
                {data.openTasks.slice(0, 5).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-sm">
                    <span
                      className={cn(
                        'size-1.5 shrink-0 rounded-full',
                        t.focus ? 'bg-primary' : 'bg-primary/50',
                      )}
                    />
                    <span className="min-w-0 truncate">{t.title}</span>
                    {t.source === 'jarvis' && (
                      <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                        Jarvis
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {data && data.openTasks.length === 0 && !loading && (
              <p className="py-2 text-center text-sm text-muted-foreground">Clear deck. Nice.</p>
            )}
          </>
        )}
      </div>

      <div className="flex items-center gap-2 border-t border-border px-5 py-3">
        <Button size="sm" onClick={() => showWindow('capture')} className="flex-1">
          <Plus className="size-3.5" /> Capture
        </Button>
        <Button size="sm" variant="secondary" onClick={openDashboard} aria-label="Open full dashboard">
          <ExternalLink className="size-3.5" />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void refresh()} aria-label="Refresh">
          <RefreshCw className={cn('size-3.5', loading && 'animate-spin')} />
        </Button>
        <Button size="sm" variant="ghost" onClick={() => showWindow('settings')} aria-label="Settings">
          <SettingsIcon className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS (no errors). The file is not wired in yet; this just confirms the move compiles.

- [ ] **Step 3: Commit**

```bash
git add src/windows/sections/Today.tsx
git commit -m "feat(deck): extract Today section from Glance body"
```

---

## Task 5: The placeholder section

**Files:**
- Create: `src/windows/sections/Placeholder.tsx`

- [ ] **Step 1: Create the placeholder**

Create `src/windows/sections/Placeholder.tsx`:
```tsx
import { Sparkles } from 'lucide-react';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <Sparkles className="size-5 text-mint" />
      <p className="font-display text-lg">{title}</p>
      <p className="text-sm text-muted-foreground">
        Coming to the Deck soon. For now, open the dashboard for {title.toLowerCase()}.
      </p>
    </div>
  );
}
```

- [ ] **Step 2: Verify it typechecks**

Run: `pnpm exec tsc --noEmit`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add src/windows/sections/Placeholder.tsx
git commit -m "feat(deck): reusable placeholder section"
```

---

## Task 6: Assemble the Deck shell

**Files:**
- Create: `src/windows/Deck.tsx`
- Test: `src/windows/Deck.test.tsx`

`useAgentContext` calls the agent (network) on mount, and `registerShortcuts` touches Tauri APIs. The routing test renders the Deck and asserts section switching without depending on either — so both are mocked in the test.

- [ ] **Step 1: Write the failing routing test**

Create `src/windows/Deck.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

// Isolate the routing test from network + Tauri: stub the shortcut registration,
// the context hook, and the two banners (which otherwise call loadSettings/fetch).
vi.mock('@/lib/bootstrap', () => ({ registerShortcuts: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({ data: null, error: null, loading: false, refresh: vi.fn() }),
}));
vi.mock('@/components/ParityBanner', () => ({ ParityBanner: () => null }));
vi.mock('@/components/UpdateBanner', () => ({ UpdateBanner: () => null }));

import { Deck } from '@/windows/Deck';

describe('Deck', () => {
  it('shows Today by default', () => {
    render(<Deck />);
    expect(screen.getByRole('heading', { name: /Austin\./ })).toBeInTheDocument();
  });

  it('switches to a placeholder section when its rail item is clicked', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByText('Notes', { selector: 'p.font-display' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Austin\./ })).not.toBeInTheDocument();
  });
});
```

Testing Library auto-cleans the DOM between tests because `globals: true` is set in `vitest.config.ts` — no manual teardown needed.

- [ ] **Step 2: Run it to confirm it fails**

Run: `pnpm test src/windows/Deck.test.tsx`
Expected: FAIL — cannot resolve `@/windows/Deck`.

- [ ] **Step 3: Implement the Deck shell**

Create `src/windows/Deck.tsx`:
```tsx
import { useEffect, useState } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { Rail } from '@/components/Rail';
import { registerShortcuts } from '@/lib/bootstrap';
import { type SectionId } from '@/lib/sections';
import { Today } from '@/windows/sections/Today';
import { Placeholder } from '@/windows/sections/Placeholder';

const PLACEHOLDERS: Record<Exclude<SectionId, 'today'>, string> = {
  mood: 'Mood',
  tasks: 'Tasks',
  notes: 'Notes',
  sleep: 'Sleep',
  habits: 'Habits',
  life: 'Life',
};

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
        <div className="min-w-0 flex-1">
          {active === 'today' ? <Today /> : <Placeholder title={PLACEHOLDERS[active]} />}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run the test to confirm it passes**

Run: `pnpm test src/windows/Deck.test.tsx`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add src/windows/Deck.tsx src/windows/Deck.test.tsx
git commit -m "feat(deck): shell window with rail + section routing"
```

---

## Task 7: Wire the Deck into the app and remove the old Glance

**Files:**
- Modify: `src/App.tsx`
- Delete: `src/windows/Glance.tsx`

- [ ] **Step 1: Point App at the Deck**

Edit `src/App.tsx`: replace the `Glance` import and default-case render with `Deck`:
```tsx
import { currentScreen } from '@/lib/window';
import { Deck } from '@/windows/Deck';
import { Morning } from '@/windows/Morning';
import { Capture } from '@/windows/Capture';
import { Settings } from '@/windows/Settings';
import { Widget } from '@/windows/Widget';

export function App() {
  const screen = currentScreen();
  switch (screen) {
    case 'morning':
      return <Morning />;
    case 'capture':
      return <Capture />;
    case 'settings':
      return <Settings />;
    case 'widget':
      return <Widget />;
    default:
      return <Deck />;
  }
}
```

- [ ] **Step 2: Delete the old Glance window**

Run: `git rm src/windows/Glance.tsx`
Expected: file removed. (Its body now lives in `sections/Today.tsx`; no other file imports `Glance`.)

- [ ] **Step 3: Confirm nothing else imports Glance**

Run: `grep -rn "windows/Glance" src || echo "no references"`
Expected: `no references`.

- [ ] **Step 4: Typecheck + full test run**

Run: `pnpm exec tsc --noEmit && pnpm test`
Expected: tsc PASS; Vitest PASS (all suites: sections, Rail, Deck).

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx src/windows/Glance.tsx
git commit -m "feat(deck): route default window to Deck, drop old Glance"
```

---

## Task 8: Widen the window to Deck size

**Files:**
- Modify: `src-tauri/tauri.conf.json:18-30`

- [ ] **Step 1: Update the glance window dimensions**

In `src-tauri/tauri.conf.json`, the first window object (label `glance`) — change `width` and `height` only; leave `label`, `resizable`, `decorations`, `transparent`, etc. unchanged:
```json
      {
        "label": "glance",
        "title": "Austin's Deck",
        "width": 580,
        "height": 640,
        "resizable": false,
        "visible": false,
        "decorations": false,
        "transparent": true,
        "shadow": false,
        "center": true,
        "skipTaskbar": false
      },
```

- [ ] **Step 2: Validate the JSON + Rust config**

Run: `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8')); console.log('json ok')"`
Expected: `json ok`.

- [ ] **Step 3: Commit**

```bash
git add src-tauri/tauri.conf.json
git commit -m "feat(deck): widen main window for the rail + sections"
```

---

## Task 9: Whole-build verification

**Files:** none (verification only)

- [ ] **Step 1: Frontend build**

Run: `pnpm build`
Expected: `tsc --noEmit` clean, then vite `built in …` with no errors.

- [ ] **Step 2: Parity check unchanged**

Run: `node scripts/parity-check.mjs`
Expected: `parity.json valid.` (statuses unchanged — this PR flips nothing).

- [ ] **Step 3: Manual smoke in the browser**

Run: `pnpm dev` then open `http://localhost:1420/?w=glance`.
Expected: the Deck renders with the left rail; **Today** shows the date/greeting/tiles; clicking **Mood/Tasks/Notes/Sleep/Habits/Life** swaps to that placeholder; clicking **Today** returns. Stop the dev server when done.

- [ ] **Step 4: Rust still compiles (optional, slow)**

Run: `(cd src-tauri && cargo build)`
Expected: `Finished dev profile`. (No Rust changed; this only re-validates the config edit.)

- [ ] **Step 5: Final commit if anything was adjusted**

```bash
git status
# only if Steps surfaced fixes:
git commit -am "fix(deck): build/smoke adjustments"
```

---

## Definition of done

- `pnpm build` clean; `pnpm test` green (sections, Rail, Deck suites).
- Deck window renders the rail + Today + six working placeholder sections.
- `parity.json` unchanged (no feature promoted yet); `node scripts/parity-check.mjs` still valid.
- Old `Glance.tsx` gone; `App.tsx` renders `Deck`; window label still `glance`.
- Open a PR `feat/deck-shell` → review → merge. No web-repo or manifest changes in this increment.
