import { ArrowRight, Moon, Plus, X } from 'lucide-react';
import { useState } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { MoodPad } from '@/components/MoodPad';
import { Button } from '@/components/ui/button';
import { agent } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { greeting, longDate, todayIso } from '@/lib/format';
import { saveSettings } from '@/lib/settings';
import { hideSelf } from '@/lib/win-actions';

const QUALITIES = [
  { n: 1, label: 'rough' },
  { n: 2, label: 'poor' },
  { n: 3, label: 'ok' },
  { n: 4, label: 'good' },
  { n: 5, label: 'great' },
];

export function Morning() {
  const [valence, setValence] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [sleepQuality, setSleepQuality] = useState<number | null>(null);
  const [woke, setWoke] = useState('');
  const [note, setNote] = useState('');
  const [taskInput, setTaskInput] = useState('');
  const [tasks, setTasks] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function addTask() {
    const t = taskInput.trim();
    if (!t) return;
    setTasks((cur) => [...cur, t]);
    setTaskInput('');
  }

  async function finish(skip: boolean) {
    setErr(null);
    setBusy(true);
    try {
      if (!skip) {
        const jobs: Promise<unknown>[] = [];
        if (valence !== null && energy !== null) {
          jobs.push(
            agent.logMood({ valence, energy, source: 'self', prompt: 'Morning check-in: how are you starting the day?' }),
          );
        }
        if (sleepQuality !== null || woke.trim()) {
          jobs.push(
            agent.logSleep({
              on: todayIso(),
              quality: sleepQuality ?? undefined,
              wakeTime: woke.trim() || undefined,
              source: 'self',
            }),
          );
        }
        if (note.trim()) {
          jobs.push(agent.addNote({ title: 'Morning note', body: note.trim() }));
        }
        for (const t of tasks) jobs.push(agent.addTask({ title: t }));
        const pending = taskInput.trim();
        if (pending) jobs.push(agent.addTask({ title: pending }));
        await Promise.all(jobs);
      }
      await saveSettings({ lastMorning: todayIso() });
      await hideSelf();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save — check Settings.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="app-shell flex h-full flex-col">
      <TitleBar title="Morning check-in" />
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-4">
        <header className="space-y-1">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            {longDate()}
          </p>
          <h1 className="font-display text-2xl tracking-tight">{greeting()}, Austin.</h1>
          <p className="text-sm text-muted-foreground">How's it shaping up? Two taps and you're set.</p>
        </header>

        <section className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            How are you starting?
          </p>
          <MoodPad
            valence={valence}
            energy={energy}
            onChange={(v, e) => {
              setValence(v);
              setEnergy(e);
            }}
          />
        </section>

        <section className="space-y-2">
          <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            <Moon className="size-3 text-mint" /> Last night
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            {QUALITIES.map((q) => (
              <button
                key={q.n}
                type="button"
                onClick={() => setSleepQuality((cur) => (cur === q.n ? null : q.n))}
                className={cn(
                  'no-drag flex flex-col items-center rounded-md border px-2.5 py-1 transition-colors',
                  sleepQuality === q.n
                    ? 'border-mint/50 bg-mint/10 text-foreground'
                    : 'border-border bg-surface/40 text-muted-foreground hover:text-foreground',
                )}
              >
                <span className="font-display text-sm leading-none">{q.n}</span>
                <span className="text-[9px]">{q.label}</span>
              </button>
            ))}
            <input
              value={woke}
              onChange={(e) => setWoke(e.target.value)}
              placeholder="woke ~"
              className="h-8 w-20 rounded-md border border-input bg-surface/40 px-2 text-xs outline-none focus:border-border-strong"
            />
          </div>
        </section>

        <section className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Anything on your mind?
          </p>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="A line for the record…"
            className="h-16 w-full resize-none rounded-md border border-input bg-surface/50 p-2.5 text-sm outline-none focus:border-border-strong"
          />
        </section>

        <section className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Quick things to do?
          </p>
          <div className="flex gap-2">
            <input
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addTask()}
              placeholder="Add a task and press enter…"
              className="h-9 flex-1 rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
            />
            <Button variant="secondary" size="sm" onClick={addTask} aria-label="Add task">
              <Plus className="size-3.5" />
            </Button>
          </div>
          {tasks.length > 0 && (
            <ul className="space-y-1">
              {tasks.map((t, i) => (
                <li
                  key={`${t}-${i}`}
                  className="flex items-center justify-between rounded-md bg-surface/40 px-2.5 py-1.5 text-sm"
                >
                  <span className="truncate">{t}</span>
                  <button
                    type="button"
                    onClick={() => setTasks((cur) => cur.filter((_, j) => j !== i))}
                    className="no-drag text-muted-foreground hover:text-foreground"
                    aria-label="Remove"
                  >
                    <X className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>

        {err && <p className="text-xs text-destructive">{err}</p>}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border px-6 py-3">
        <Button variant="ghost" size="sm" onClick={() => finish(true)} disabled={busy}>
          Skip
        </Button>
        <Button size="sm" onClick={() => finish(false)} disabled={busy}>
          {busy ? 'Saving…' : 'Start the day'} <ArrowRight className="size-3.5" />
        </Button>
      </div>
    </div>
  );
}
