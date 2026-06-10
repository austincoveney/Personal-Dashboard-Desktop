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
                {' · '}
                <span>{doneCount}/{habits.length}</span>
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
