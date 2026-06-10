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
