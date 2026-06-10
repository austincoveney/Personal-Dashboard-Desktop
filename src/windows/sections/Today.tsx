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
import { Agenda } from '@/windows/sections/Agenda';
import { Wins } from '@/windows/sections/Wins';
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

            <div className="space-y-2">
              <div className="accent-rule" />
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                Today&apos;s shape
              </p>
              <Agenda
                narrative={data?.dayPlan?.narrative ?? null}
                blocks={data?.dayPlan?.blocks ?? []}
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

            {data && data.achievementsToday.length > 0 && (
              <div className="space-y-2">
                <div className="accent-rule" />
                <Wins wins={data.achievementsToday} />
              </div>
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
