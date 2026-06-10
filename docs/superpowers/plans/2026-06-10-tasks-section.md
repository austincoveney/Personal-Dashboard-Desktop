# Tasks → full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promote `tasks` partial→full. Web gains agent-authed `PATCH`/`DELETE /api/agent/tasks/:id`; desktop gets a Tasks section that lists open tasks and lets you complete, focus, re-prioritise, delete, and add them.

**Architecture:** Web adds one route file mirroring the existing session-authed `tasks/[id]` route but guarded by `requireAgent` and without the Plane push (the poller reconciles Plane). Desktop adds `updateTask`/`deleteTask` agent methods (and `DELETE` to the request verb union), a `nextPriority` helper, and a Tasks section wired via `sectionView()`. Two PRs: web (mutating endpoints) then desktop.

**Tech Stack:** Web = Next.js App Router + Drizzle + Zod (`taskUpdateSchema`), verified via `next build` + biome. Desktop = React 19 + Vitest + Tailwind, warm-dark Identity Anchor.

---

## WEB half (repo `/home/austin/development/personal/Personal Dashboard`, branch `feat/agent-task-mutations`)

Executed by the controller inline. Documented for the record.

1. **Create `src/app/api/agent/tasks/[id]/route.ts`** (agent-authed PATCH + DELETE; reuses `taskUpdateSchema`, `parseId`, `taskRepo.update/remove`):
```ts
import type { NextRequest } from 'next/server';
import { taskRepo } from '@/db/repos';
import { requireAgent } from '@/lib/agent-auth';
import { fail, ok, parseId, readValidated, route } from '@/lib/api';
import { taskUpdateSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAgent(request);
  if (denied) return denied;
  return route(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) return fail('Invalid id', 400);
    const result = await readValidated(request, taskUpdateSchema);
    if ('response' in result) return result.response;
    const updated = await taskRepo.update(numId, result.data);
    if (!updated) return fail('Not found', 404);
    return ok(updated);
  });
}

export function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAgent(request);
  if (denied) return denied;
  return route(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) return fail('Invalid id', 400);
    const removed = await taskRepo.remove(numId);
    if (!removed) return fail('Not found or not editable', 404);
    return ok(removed);
  });
}
```
2. **`features.json`** — `manifestVersion` 1.0.3 → 1.0.4; `tasks` `platforms.desktop` partial → full. (`agentEndpoints` stays `["tasks"]` — the `[id]` sub-route is implementation detail; the parity-check reverse-scan only reads top-level `api/agent/*` dirs.)
3. **`package.json`** — `version` 0.1.1 → 0.1.2.
4. Verify: `node scripts/parity-check.mjs` (→ `desktop full 4/13`); `pnpm build`; `biome check` on the new file. Commit, push, PR.

---

## Task D1: Desktop agent — DELETE verb + task mutation methods (branch `feat/tasks-section`)

**Files:** Modify `src/lib/agent.ts`.

- [ ] **Step 1: Allow the DELETE verb.** Change the `RequestOptions.method` union (currently `'GET' | 'POST' | 'PATCH'`) to:
```ts
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
```

- [ ] **Step 2: Add a patch type.** Above `export class AgentError`, add:
```ts
export interface TaskPatch {
  title?: string;
  status?: 'open' | 'in_progress' | 'done';
  priority?: 'none' | 'low' | 'med' | 'high' | 'urgent';
  focus?: boolean;
  dueDate?: string | null;
  detail?: string | null;
}
```

- [ ] **Step 3: Add two methods** to the `agent` object (after `addTask`):
```ts
  updateTask: (id: number, patch: TaskPatch) =>
    request<unknown>(`/api/agent/tasks/${id}`, { method: 'PATCH', body: patch }),
  deleteTask: (id: number) => request<unknown>(`/api/agent/tasks/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 4: Typecheck** — `pnpm exec tsc --noEmit` (PASS).

- [ ] **Step 5: Commit.**
```bash
git add src/lib/agent.ts
git commit -m "feat(tasks): task update/delete agent methods + DELETE verb

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D2: Priority helper (TDD)

**Files:** Create `src/lib/tasks.ts`; create `src/lib/tasks.test.ts`.

- [ ] **Step 1: Write the failing test** `src/lib/tasks.test.ts`:
```ts
import { describe, expect, it } from 'vitest';
import { nextPriority, priorityTone } from '@/lib/tasks';

describe('nextPriority', () => {
  it('cycles none → low → med → high → urgent → none', () => {
    expect(nextPriority('none')).toBe('low');
    expect(nextPriority('low')).toBe('med');
    expect(nextPriority('med')).toBe('high');
    expect(nextPriority('high')).toBe('urgent');
    expect(nextPriority('urgent')).toBe('none');
  });
});

describe('priorityTone', () => {
  it('gives each priority a token class', () => {
    expect(priorityTone('urgent')).toBe('text-destructive');
    expect(priorityTone('high')).toBe('text-warning');
    expect(priorityTone('med')).toBe('text-primary');
    expect(priorityTone('low')).toBe('text-mint');
    expect(priorityTone('none')).toBe('text-muted-foreground');
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `pnpm test src/lib/tasks.test.ts`.

- [ ] **Step 3: Implement** `src/lib/tasks.ts`:
```ts
import type { TaskSummary } from '@/lib/agent';

export type Priority = TaskSummary['priority'];

const ORDER: Priority[] = ['none', 'low', 'med', 'high', 'urgent'];

export function nextPriority(p: Priority): Priority {
  const i = ORDER.indexOf(p);
  return ORDER[(i + 1) % ORDER.length] ?? 'none';
}

export function priorityTone(p: Priority): string {
  switch (p) {
    case 'urgent':
      return 'text-destructive';
    case 'high':
      return 'text-warning';
    case 'med':
      return 'text-primary';
    case 'low':
      return 'text-mint';
    default:
      return 'text-muted-foreground';
  }
}
```

- [ ] **Step 4: Run it, confirm it passes** — `pnpm test src/lib/tasks.test.ts`.

- [ ] **Step 5: Commit.**
```bash
git add src/lib/tasks.ts src/lib/tasks.test.ts
git commit -m "feat(tasks): priority cycle + tone helpers

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D3: The Tasks section (TDD)

**Files:** Create `src/windows/sections/Tasks.tsx`; create `src/windows/sections/Tasks.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Tasks.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type TaskSummary } from '@/lib/agent';

const tasks: TaskSummary[] = [
  { id: 1, title: 'Ship tasks', status: 'open', priority: 'none', focus: false, dueDate: null, source: 'self' },
  { id: 2, title: 'Reply to Zach', status: 'open', priority: 'high', focus: true, dueDate: null, source: 'self' },
];

vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({
    data: { openTasks: tasks },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { Tasks } from '@/windows/sections/Tasks';

describe('Tasks', () => {
  it('lists open tasks with the count', () => {
    render(<Tasks />);
    expect(screen.getByText('Ship tasks')).toBeInTheDocument();
    expect(screen.getByText('Reply to Zach')).toBeInTheDocument();
    expect(screen.getByText('· 2')).toBeInTheDocument();
  });

  it('completes a task', async () => {
    const spy = vi.spyOn(agent, 'updateTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete Ship tasks' }));
    expect(spy).toHaveBeenCalledWith(1, { status: 'done' });
  });

  it('cycles a task priority', async () => {
    const spy = vi.spyOn(agent, 'updateTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Priority none' }));
    expect(spy).toHaveBeenCalledWith(1, { priority: 'low' });
  });

  it('toggles focus', async () => {
    const spy = vi.spyOn(agent, 'updateTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Unfocus' }));
    expect(spy).toHaveBeenCalledWith(2, { focus: false });
  });

  it('deletes a task', async () => {
    const spy = vi.spyOn(agent, 'deleteTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Ship tasks' }));
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('adds a task', async () => {
    const spy = vi.spyOn(agent, 'addTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.type(screen.getByPlaceholderText('Add a task…'), 'New thing');
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(spy).toHaveBeenCalledWith({ title: 'New thing' });
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `pnpm test src/windows/sections/Tasks.test.tsx`.

- [ ] **Step 3: Implement** `src/windows/sections/Tasks.tsx`:
```tsx
import { Check, Plus, Star, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { agent } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { nextPriority, priorityTone } from '@/lib/tasks';
import { useAgentContext } from '@/lib/use-context';

export function Tasks() {
  const { data, refresh } = useAgentContext();
  const [title, setTitle] = useState('');
  const [pending, setPending] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const tasks = data?.openTasks ?? [];

  async function run(id: number, fn: () => Promise<unknown>) {
    setPending(id);
    setErr(null);
    try {
      await fn();
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setPending(null);
    }
  }

  async function add() {
    const t = title.trim();
    if (!t) return;
    setBusy(true);
    setErr(null);
    try {
      await agent.addTask({ title: t });
      setTitle('');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not add');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">Open work</p>
          <h1 className="font-display text-xl tracking-tight">
            Tasks
            {tasks.length > 0 && <span className="text-muted-foreground"> · {tasks.length}</span>}
          </h1>
        </header>

        <div className="flex gap-2">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void add()}
            placeholder="Add a task…"
            className="h-9 flex-1 rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
          />
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || title.trim() === ''}
            aria-label="Add task"
            className="no-drag grid size-9 shrink-0 place-items-center rounded-md bg-primary text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            <Plus className="size-4" />
          </button>
        </div>

        {err && <p className="text-xs text-destructive">{err}</p>}

        {tasks.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">Clear deck. Nice.</p>
        ) : (
          <ul className="space-y-1">
            {tasks.map((t) => (
              <li
                key={t.id}
                className={cn(
                  'group flex items-center gap-2 rounded-lg border border-border bg-card px-2.5 py-2',
                  pending === t.id && 'opacity-50',
                )}
              >
                <button
                  type="button"
                  onClick={() => void run(t.id, () => agent.updateTask(t.id, { status: 'done' }))}
                  aria-label={`Complete ${t.title}`}
                  className="no-drag grid size-5 shrink-0 place-items-center rounded-full border border-border-strong text-transparent transition-colors hover:border-mint hover:text-mint"
                >
                  <Check className="size-3.5" />
                </button>
                <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                {t.source !== 'self' && t.source !== 'jarvis' && (
                  <span className="shrink-0 rounded-full bg-surface-2 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
                    {t.source}
                  </span>
                )}
                <button
                  type="button"
                  onClick={() =>
                    void run(t.id, () => agent.updateTask(t.id, { priority: nextPriority(t.priority) }))
                  }
                  aria-label={`Priority ${t.priority}`}
                  className={cn(
                    'no-drag shrink-0 px-1 font-mono text-[10px] uppercase tracking-wider',
                    priorityTone(t.priority),
                  )}
                >
                  {t.priority === 'none' ? '–' : t.priority}
                </button>
                <button
                  type="button"
                  onClick={() => void run(t.id, () => agent.updateTask(t.id, { focus: !t.focus }))}
                  aria-label={t.focus ? 'Unfocus' : 'Focus'}
                  aria-pressed={t.focus}
                  className={cn(
                    'no-drag shrink-0 transition-colors',
                    t.focus ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  <Star className={cn('size-3.5', t.focus && 'fill-primary')} />
                </button>
                <button
                  type="button"
                  onClick={() => void run(t.id, () => agent.deleteTask(t.id))}
                  aria-label={`Delete ${t.title}`}
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

- [ ] **Step 4: Run it, confirm it passes** — `pnpm test src/windows/sections/Tasks.test.tsx` (6 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/windows/sections/Tasks.tsx src/windows/sections/Tasks.test.tsx
git commit -m "feat(tasks): native Tasks section — complete/focus/priority/delete/add

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D4: Wire Tasks into the Deck

**Files:** Modify `src/windows/Deck.tsx`; modify `src/windows/Deck.test.tsx`.

- [ ] **Step 1:** In `src/windows/Deck.tsx` add `import { Tasks } from '@/windows/sections/Tasks';` (after the `Habits` import) and a case before `default`:
```tsx
    case 'tasks':
      return <Tasks />;
```

- [ ] **Step 2:** Add to `src/windows/Deck.test.tsx` inside `describe('Deck', …)`:
```tsx
  it('renders the Tasks section when Tasks is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    expect(screen.getByRole('heading', { name: /Tasks/ })).toBeInTheDocument();
  });
```

- [ ] **Step 3:** `pnpm exec tsc --noEmit && pnpm test` — all green.

- [ ] **Step 4: Commit.**
```bash
git add src/windows/Deck.tsx src/windows/Deck.test.tsx
git commit -m "feat(tasks): route the Tasks section in the Deck

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D5: Flip parity + bump version

**Files:** `parity.json`, `package.json`, `src-tauri/tauri.conf.json`.

- [ ] **Step 1:** `parity.json` — `builtAgainstManifest` 1.0.3 → 1.0.4; `tasks` partial → full.
- [ ] **Step 2:** version 0.2.4 → 0.2.5 in `package.json` and `src-tauri/tauri.conf.json`.
- [ ] **Step 3:** `node scripts/parity-check.mjs` (`parity.json valid.`); `node -e "JSON.parse(require('fs').readFileSync('src-tauri/tauri.conf.json','utf8'));console.log('json ok')"`.
- [ ] **Step 4: Commit.**
```bash
git add parity.json package.json src-tauri/tauri.conf.json
git commit -m "chore(parity): tasks full, builtAgainstManifest 1.0.4, v0.2.5

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D6: Verification + desktop PR

- [ ] **Step 1:** `pnpm build && pnpm test && node scripts/parity-check.mjs` — all green.
- [ ] **Step 2:** Manual smoke: `pnpm dev`, `?w=glance`, click **Tasks** — add/complete/focus/priority/delete against live data.
- [ ] **Step 3:** Push + PR (after the web PR is open):
```bash
git push -u origin feat/tasks-section
gh pr create --base main --head feat/tasks-section \
  --title "feat(tasks): native Tasks section — complete/focus/priority/delete/add (parity full)" \
  --body "Increment 5 of feature-max. Promotes tasks partial→full: a Tasks section listing open tasks with complete, focus toggle, priority cycle, delete, and quick-add — via new agent.updateTask/deleteTask (PATCH/DELETE /api/agent/tasks/:id). Inline title-edit deferred. Flips parity.json tasks=full + builtAgainstManifest 1.0.4; desktop v0.2.5. Pairs with web PR feat/agent-task-mutations (the new endpoints; merge first). New tests: priority helpers, Tasks section, Deck routing."
```

---

## Definition of done

- Web PR open + green: agent `PATCH`/`DELETE /api/agent/tasks/:id`, manifest 1.0.4, tasks desktop=full, web v0.1.2.
- Desktop PR open: Tasks section (complete/focus/priority/delete/add); `parity.json` tasks=full + builtAgainstManifest 1.0.4; desktop v0.2.5.
- `pnpm build`/`pnpm test` green; web `next build` + biome + parity-check green.
- No new code comments; commits conventional + trailered.
- **Merge order:** web PR first, then desktop. `v0.2.5` tag is Austin's to push.
