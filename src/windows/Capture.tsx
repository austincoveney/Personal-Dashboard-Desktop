import { Check, HeartPulse, ListTodo, NotebookPen, Star } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { MoodPad } from '@/components/MoodPad';
import { Button } from '@/components/ui/button';
import { agent } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { hideSelf } from '@/lib/win-actions';

type Tab = 'note' | 'task' | 'mood';
const PRIORITIES = ['none', 'low', 'med', 'high', 'urgent'] as const;

export function Capture() {
  const [tab, setTab] = useState<Tab>('note');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [note, setNote] = useState('');
  const [task, setTask] = useState('');
  const [priority, setPriority] = useState<(typeof PRIORITIES)[number]>('none');
  const [focus, setFocus] = useState(false);
  const [valence, setValence] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [moodNote, setMoodNote] = useState('');

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') void hideSelf();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  async function submit() {
    setErr(null);
    setBusy(true);
    try {
      if (tab === 'note') {
        if (!note.trim()) return;
        const first = note.trim().split('\n')[0] ?? 'Quick note';
        await agent.addNote({ title: first.slice(0, 60), body: note.trim() });
      } else if (tab === 'task') {
        if (!task.trim()) return;
        await agent.addTask({ title: task.trim(), priority, focus });
      } else {
        if (valence === null || energy === null) return;
        await agent.logMood({ valence, energy, note: moodNote.trim() || undefined });
      }
      setNote('');
      setTask('');
      setMoodNote('');
      setValence(null);
      setEnergy(null);
      await hideSelf();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof NotebookPen }[] = [
    { id: 'note', label: 'Note', icon: NotebookPen },
    { id: 'task', label: 'Task', icon: ListTodo },
    { id: 'mood', label: 'Mood', icon: HeartPulse },
  ];

  return (
    <div className="app-shell flex flex-col">
      <TitleBar title="Quick capture" />
      <div className="flex gap-1 px-4">
        {tabs.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                'no-drag flex flex-1 items-center justify-center gap-1.5 rounded-md py-2 text-xs font-medium transition-colors',
                tab === t.id ? 'bg-surface-2 text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Icon className="size-3.5" /> {t.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
        {tab === 'note' && (
          <textarea
            autoFocus
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="What's on your mind?"
            className="h-40 w-full resize-none rounded-md border border-input bg-surface/50 p-3 text-sm outline-none focus:border-border-strong"
          />
        )}

        {tab === 'task' && (
          <div className="space-y-3">
            <input
              autoFocus
              value={task}
              onChange={(e) => setTask(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              placeholder="Add a task…"
              className="h-10 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
            />
            <div className="flex flex-wrap gap-1.5">
              {PRIORITIES.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPriority(p)}
                  className={cn(
                    'no-drag rounded-full px-2.5 py-1 text-[11px] font-medium capitalize transition-colors',
                    priority === p
                      ? 'bg-primary/20 text-primary'
                      : 'bg-surface-2 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => setFocus((f) => !f)}
              className={cn(
                'no-drag inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                focus ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Star className={cn('size-3.5', focus && 'fill-primary')} /> Pin to today's focus
            </button>
          </div>
        )}

        {tab === 'mood' && (
          <div className="space-y-3">
            <MoodPad
              valence={valence}
              energy={energy}
              onChange={(v, e) => {
                setValence(v);
                setEnergy(e);
              }}
            />
            <input
              value={moodNote}
              onChange={(e) => setMoodNote(e.target.value)}
              placeholder="What's behind it? (optional)"
              className="h-9 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
            />
          </div>
        )}
      </div>

      {err && <p className="px-4 text-xs text-destructive">{err}</p>}

      <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-3">
        <span className="font-mono text-[10px] text-muted-foreground">Esc to close</span>
        <Button onClick={submit} disabled={busy} size="sm">
          <Check className="size-3.5" /> {busy ? 'Saving…' : 'Save'}
        </Button>
      </div>
    </div>
  );
}
