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
  const [deleting, setDeleting] = useState<Set<number>>(new Set());
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
    if (deleting.has(id)) return;
    setDeleting((s) => new Set(s).add(id));
    setErr(null);
    try {
      await agent.deleteSleep(id);
      await load();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not delete');
    } finally {
      setDeleting((s) => {
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
          aria-label="Note (optional)"
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
                  disabled={deleting.has(s.id)}
                  onClick={() => void remove(s.id)}
                  aria-label={`Delete ${shortNight(s.on)}`}
                  className="no-drag shrink-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100 disabled:opacity-50"
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
