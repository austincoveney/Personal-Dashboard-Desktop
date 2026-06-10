import { Check, Minus, TrendingDown, TrendingUp } from 'lucide-react';
import { useState } from 'react';
import { MoodPad } from '@/components/MoodPad';
import { Button } from '@/components/ui/button';
import { agent } from '@/lib/agent';
import { cn } from '@/lib/cn';
import { moodLabel } from '@/lib/format';
import { moodTrend, moodsOldestFirst, valenceBg } from '@/lib/mood';
import { useAgentContext } from '@/lib/use-context';

const TREND_ICON: Record<'up' | 'down' | 'flat', typeof TrendingUp> = {
  up: TrendingUp,
  down: TrendingDown,
  flat: Minus,
};

export function Mood() {
  const { data, refresh } = useAgentContext();
  const [valence, setValence] = useState<number | null>(null);
  const [energy, setEnergy] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const history = data?.moodHistory ?? [];
  const latest = data?.latestMood ?? null;
  const trend = moodTrend(history);
  const TrendIcon = trend ? TREND_ICON[trend] : null;

  async function submit() {
    if (valence === null || energy === null) return;
    setErr(null);
    setBusy(true);
    try {
      await agent.logMood({ valence, energy, note: note.trim() || undefined });
      setValence(null);
      setEnergy(null);
      setNote('');
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Could not save');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 space-y-4 overflow-y-auto px-5 pb-4 pt-2">
        <header className="space-y-0.5">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            How are you?
          </p>
          <h1 className="font-display text-xl tracking-tight">Log a mood</h1>
        </header>

        <MoodPad
          valence={valence}
          energy={energy}
          onChange={(v, e) => {
            setValence(v);
            setEnergy(e);
          }}
        />
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="What's behind it? (optional)"
          className="h-9 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong"
        />
        {err && <p className="text-xs text-destructive">{err}</p>}
        <Button
          onClick={submit}
          disabled={busy || valence === null || energy === null}
          size="sm"
          className="w-full"
        >
          <Check className="size-3.5" /> {busy ? 'Saving…' : 'Log mood'}
        </Button>

        <div className="accent-rule" />

        {history.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No moods logged yet — your first one starts the trend.
          </p>
        ) : (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Last {history.length}
              </p>
              {latest && (
                <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                  {moodLabel(latest.valence, latest.energy)}
                  {TrendIcon && (
                    <TrendIcon
                      className={cn(
                        'size-3.5',
                        trend === 'up'
                          ? 'text-mint'
                          : trend === 'down'
                            ? 'text-warning'
                            : 'text-muted-foreground',
                      )}
                    />
                  )}
                </p>
              )}
            </div>
            <div className="flex items-end gap-1" aria-hidden="true">
              {moodsOldestFirst(history).map((mood, i) => (
                <span
                  key={mood.loggedAt ?? i}
                  title={moodLabel(mood.valence, mood.energy)}
                  className={cn('h-6 flex-1 rounded-sm', valenceBg(mood.valence))}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
