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
