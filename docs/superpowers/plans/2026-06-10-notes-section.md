# Notes → full Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Promote `notes` partial→full. Web gains agent-authed `GET /api/agent/note` (list — the context exposes no notes today), `PATCH`/`DELETE /api/agent/note/:id`; desktop gets a Notes section: a composer that creates and edits, plus a pinned-first list with pin/unpin and delete.

**Architecture:** Web adds a GET handler to the existing agent note route and a new `[id]` PATCH/DELETE route (both `requireAgent`), reusing `noteRepo.list/update/remove` + `noteUpdateSchema`. Desktop adds `getNotes`/`updateNote`/`deleteNote` methods + a `Notes` section (one composer shared by create + edit, an `editingId` toggles the mode) wired via `sectionView()`. Two PRs: web then desktop.

**Tech Stack:** Web = Next.js + Drizzle (`noteRepo`), verified via `next build` + biome. Desktop = React 19 + Vitest + Tailwind, warm-dark Identity Anchor.

---

## WEB half (repo `/home/austin/development/personal/Personal Dashboard`, branch `feat/agent-note-read-mutate`)

Executed by the controller inline.

1. **Add `GET` to `src/app/api/agent/note/route.ts`** (keep POST; add `ok` to the `@/lib/api` import):
```ts
export function GET(request: NextRequest) {
  const denied = requireAgent(request);
  if (denied) return denied;
  return route(async () => ok(await noteRepo.list()));
}
```
2. **Create `src/app/api/agent/note/[id]/route.ts`** (agent-authed PATCH + DELETE):
```ts
import type { NextRequest } from 'next/server';
import { noteRepo } from '@/db/repos';
import { requireAgent } from '@/lib/agent-auth';
import { fail, ok, parseId, readValidated, route } from '@/lib/api';
import { noteUpdateSchema } from '@/lib/schemas';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const denied = requireAgent(request);
  if (denied) return denied;
  return route(async () => {
    const { id } = await params;
    const numId = parseId(id);
    if (numId === null) return fail('Invalid id', 400);
    const result = await readValidated(request, noteUpdateSchema);
    if ('response' in result) return result.response;
    const updated = await noteRepo.update(numId, result.data);
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
    const removed = await noteRepo.remove(numId);
    if (!removed) return fail('Not found', 404);
    return ok(removed);
  });
}
```
3. **`features.json`**: `manifestVersion` 1.0.5 → 1.0.6; `notes` `platforms.desktop` partial → full.
4. **`package.json`**: 0.1.3 → 0.1.4.
5. Verify: `node scripts/parity-check.mjs` (→ `desktop full 6/13`); `pnpm build`; biome on the two files. Commit, push, PR.

---

## Task D1: Desktop agent — note read/mutate (branch `feat/notes-section`)

**Files:** Modify `src/lib/agent.ts`.

- [ ] **Step 1:** Add a summary + patch type. Above `export class AgentError`, add:
```ts
export interface NoteSummary {
  id: number;
  title: string;
  body: string;
  pinned: boolean;
  updatedAt: string;
}

export interface NotePatch {
  title?: string;
  body?: string;
  pinned?: boolean;
}
```

- [ ] **Step 2:** Add three methods to the `agent` object (after `addNote`):
```ts
  getNotes: () => request<NoteSummary[]>('/api/agent/note'),
  updateNote: (id: number, patch: NotePatch) =>
    request<unknown>(`/api/agent/note/${id}`, { method: 'PATCH', body: patch }),
  deleteNote: (id: number) => request<unknown>(`/api/agent/note/${id}`, { method: 'DELETE' }),
```

- [ ] **Step 3:** `pnpm exec tsc --noEmit` (PASS).

- [ ] **Step 4: Commit.**
```bash
git add src/lib/agent.ts
git commit -m "feat(notes): note list/update/delete agent methods

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D2: The Notes section (TDD)

**Files:** Create `src/windows/sections/Notes.tsx`; create `src/windows/sections/Notes.test.tsx`.

- [ ] **Step 1: Write the failing test** `src/windows/sections/Notes.test.tsx`:
```tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type NoteSummary } from '@/lib/agent';

const notes: NoteSummary[] = [
  { id: 1, title: 'Groceries', body: 'milk, eggs', pinned: false, updatedAt: '2026-06-10T08:00:00Z' },
  { id: 2, title: 'Ideas', body: '', pinned: true, updatedAt: '2026-06-09T08:00:00Z' },
];

describe('Notes', () => {
  it('lists notes', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    expect(await screen.findByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Ideas')).toBeInTheDocument();
  });

  it('creates a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue([]);
    const spy = vi.spyOn(agent, 'addNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await userEvent.type(screen.getByLabelText('Note title'), 'New');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(spy).toHaveBeenCalledWith({ title: 'New', body: '' });
  });

  it('toggles pin on a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const spy = vi.spyOn(agent, 'updateNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await screen.findByText('Groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(spy).toHaveBeenCalledWith(1, { pinned: true });
  });

  it('edits a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const spy = vi.spyOn(agent, 'updateNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await screen.findByText('Groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Groceries' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(spy).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Groceries' }));
  });

  it('deletes a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const spy = vi.spyOn(agent, 'deleteNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await screen.findByText('Groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Groceries' }));
    expect(spy).toHaveBeenCalledWith(1);
  });
});
```

- [ ] **Step 2: Run it, confirm it fails** — `pnpm test src/windows/sections/Notes.test.tsx`.

- [ ] **Step 3: Implement** `src/windows/sections/Notes.tsx`:
```tsx
import { Check, Pin, Trash2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { agent, type NoteSummary } from '@/lib/agent';
import { cn } from '@/lib/cn';

export function Notes() {
  const [notes, setNotes] = useState<NoteSummary[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState<Set<number>>(new Set());
  const [err, setErr] = useState<string | null>(null);

  async function load() {
    try {
      setNotes(await agent.getNotes());
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not load notes');
    }
  }

  useEffect(() => {
    void load();
  }, []);

  function reset() {
    setEditingId(null);
    setTitle('');
    setBody('');
  }

  async function save() {
    if (!title.trim() && !body.trim()) return;
    setBusy(true);
    setErr(null);
    try {
      const payload = { title: title.trim() || 'Untitled', body };
      if (editingId != null) {
        await agent.updateNote(editingId, payload);
      } else {
        await agent.addNote(payload);
      }
      reset();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  function edit(n: NoteSummary) {
    setEditingId(n.id);
    setTitle(n.title);
    setBody(n.body);
  }

  async function act(id: number, fn: () => Promise<unknown>) {
    setPending((s) => new Set(s).add(id));
    setErr(null);
    try {
      await fn();
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not update');
    } finally {
      setPending((s) => {
        const next = new Set(s);
        next.delete(id);
        return next;
      });
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {editingId != null ? 'Editing' : 'Capture'}
          </p>
          <h1 className="font-display text-xl tracking-tight">Notes</h1>
        </header>

        <div className="space-y-2">
          <input
            aria-label="Note title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="h-9 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
          />
          <textarea
            aria-label="Note body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="What's on your mind?"
            className="h-24 w-full resize-none rounded-md border border-input bg-surface/50 p-3 text-sm outline-none focus:border-border-strong"
          />
          {err && <p className="text-xs text-destructive">{err}</p>}
          <div className="flex gap-2">
            <Button
              onClick={save}
              disabled={busy || (!title.trim() && !body.trim())}
              size="sm"
              className="flex-1"
            >
              <Check className="size-3.5" /> {editingId != null ? 'Save' : 'Add note'}
            </Button>
            {editingId != null && (
              <Button variant="secondary" size="sm" onClick={reset} aria-label="Cancel edit">
                <X className="size-3.5" />
              </Button>
            )}
          </div>
        </div>

        <div className="accent-rule" />

        {notes.length === 0 ? (
          <p className="text-sm text-muted-foreground">No notes yet.</p>
        ) : (
          <ul className="space-y-1.5">
            {notes.map((n) => (
              <li
                key={n.id}
                className={cn(
                  'group rounded-lg border bg-card p-3',
                  pending.has(n.id) && 'opacity-50',
                  editingId === n.id ? 'border-primary/40' : 'border-border',
                )}
              >
                <div className="flex items-start gap-2">
                  <button
                    type="button"
                    disabled={pending.has(n.id)}
                    onClick={() => void act(n.id, () => agent.updateNote(n.id, { pinned: !n.pinned }))}
                    aria-label={n.pinned ? 'Unpin' : 'Pin'}
                    className={cn(
                      'no-drag shrink-0 transition-colors',
                      n.pinned ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
                    )}
                  >
                    <Pin className={cn('size-3.5', n.pinned && 'fill-primary')} />
                  </button>
                  <button
                    type="button"
                    onClick={() => edit(n)}
                    aria-label={`Edit ${n.title}`}
                    className="no-drag min-w-0 flex-1 text-left"
                  >
                    <p className="truncate text-sm font-medium">{n.title}</p>
                    {n.body && (
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">{n.body}</p>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={pending.has(n.id)}
                    onClick={() => void act(n.id, () => agent.deleteNote(n.id))}
                    aria-label={`Delete ${n.title}`}
                    className="no-drag shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run it, confirm it passes** — `pnpm test src/windows/sections/Notes.test.tsx` (5 tests).

- [ ] **Step 5: Commit.**
```bash
git add src/windows/sections/Notes.tsx src/windows/sections/Notes.test.tsx
git commit -m "feat(notes): native Notes section — compose, edit, pin, delete

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D3: Wire Notes into the Deck

**Files:** Modify `src/windows/Deck.tsx`; modify `src/windows/Deck.test.tsx`.

- [ ] **Step 1:** In `src/windows/Deck.tsx` add `import { Notes } from '@/windows/sections/Notes';` (after the `Sleep` import) and a case before `default`:
```tsx
    case 'notes':
      return <Notes />;
```

- [ ] **Step 2:** Add to `src/windows/Deck.test.tsx` inside `describe('Deck', …)` (no new mock needed — `Notes` calls `agent.getNotes` on mount, which throws `AgentError('No agent token')` synchronously in the test env and is caught by `load()`):
```tsx
  it('renders the Notes section when Notes is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
  });
```

- [ ] **Step 3:** `pnpm exec tsc --noEmit && pnpm test` — all green.

- [ ] **Step 4: Commit.**
```bash
git add src/windows/Deck.tsx src/windows/Deck.test.tsx
git commit -m "feat(notes): route the Notes section in the Deck

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D4: Flip parity + bump version

**Files:** `parity.json`, `package.json`, `src-tauri/tauri.conf.json`.

- [ ] **Step 1:** `parity.json` — `builtAgainstManifest` 1.0.5 → 1.0.6; `notes` partial → full.
- [ ] **Step 2:** version 0.2.6 → 0.2.7 in `package.json` and `src-tauri/tauri.conf.json`.
- [ ] **Step 3:** `node scripts/parity-check.mjs` (`parity.json valid.`); validate the tauri JSON.
- [ ] **Step 4: Commit.**
```bash
git add parity.json package.json src-tauri/tauri.conf.json
git commit -m "chore(parity): notes full, builtAgainstManifest 1.0.6, v0.2.7

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task D5: Verification + desktop PR

- [ ] **Step 1:** `pnpm build && pnpm test && node scripts/parity-check.mjs` — all green.
- [ ] **Step 2:** Manual smoke: `pnpm dev`, `?w=glance`, click **Notes** — create, edit (click a note → Save), pin, delete.
- [ ] **Step 3:** Push + PR (after the web PR is open):
```bash
git push -u origin feat/notes-section
gh pr create --base main --head feat/notes-section \
  --title "feat(notes): native Notes section — compose/edit/pin/delete (parity full)" \
  --body "Increment 7 of feature-max (6/7 partials). Promotes notes partial→full: a Notes section with a composer (create + edit via one shared form) and a pinned-first list with pin/unpin and delete. New agent getNotes/updateNote/deleteNote (GET /api/agent/note, PATCH/DELETE /api/agent/note/:id). Flips parity.json notes=full + builtAgainstManifest 1.0.6; desktop v0.2.7. Pairs with web PR feat/agent-note-read-mutate (merge first). New tests: Notes section (list/create/pin/edit/delete), Deck routing."
```

---

## Definition of done

- Web PR open + green: agent `GET`/`PATCH`/`DELETE` for notes, manifest 1.0.6, notes desktop=full, web v0.1.4.
- Desktop PR open: Notes section (compose/edit/pin/delete); `parity.json` notes=full + builtAgainstManifest 1.0.6; desktop v0.2.7.
- `pnpm build`/`pnpm test` green; web `next build` + biome + parity-check green.
- No new code comments; commits conventional + trailered. Per-row mutation buttons disabled while in-flight.
- **Merge order:** web PR first, then desktop. `v0.2.7` tag is Austin's to push.
