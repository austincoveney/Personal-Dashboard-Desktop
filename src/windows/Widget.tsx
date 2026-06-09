import { HeartPulse, Moon, Plus, Star, X } from 'lucide-react';
import type { ComponentType } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { fmtDur, moodLabel, moodTone } from '@/lib/format';
import { useAgentContext } from '@/lib/use-context';
import { hideSelf, showWindow } from '@/lib/win-actions';

function Stat({
  icon: Icon,
  value,
  tone,
  accent,
}: {
  icon: ComponentType<{ className?: string }>;
  value: string;
  tone?: string;
  accent: 'amber' | 'mint';
}) {
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <Icon className={cn('size-3.5 shrink-0', accent === 'mint' ? 'text-mint' : 'text-primary')} />
      <span className={cn('truncate text-xs font-medium', tone)}>{value}</span>
    </div>
  );
}

export function Widget() {
  const { data } = useAgentContext(120_000);
  const mood = data?.latestMood ?? null;
  const focus = data?.openTasks.filter((t) => t.focus).length ?? 0;
  const open = data?.openTasks.length ?? 0;

  return (
    <div
      data-tauri-drag-region=""
      className="app-shell flex h-full flex-col justify-between p-3"
    >
      <div className="flex items-start justify-between">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
          Austin's deck
        </span>
        <button
          type="button"
          onClick={hideSelf}
          aria-label="Hide"
          className="no-drag text-muted-foreground/60 hover:text-foreground"
        >
          <X className="size-3" />
        </button>
      </div>

      <div className="space-y-1.5">
        <Stat
          icon={HeartPulse}
          accent="amber"
          value={mood ? moodLabel(mood.valence, mood.energy) : 'no mood yet'}
          tone={mood ? moodTone(mood.valence) : 'text-muted-foreground'}
        />
        <Stat
          icon={Moon}
          accent="mint"
          value={data?.latestSleep ? fmtDur(data.latestSleep.asleepMin) : 'log sleep'}
        />
        <Stat icon={Star} accent="amber" value={`${focus} focus · ${open} open`} />
      </div>

      <Button size="sm" className="no-drag w-full" onClick={() => showWindow('capture')}>
        <Plus className="size-3.5" /> Capture
      </Button>
    </div>
  );
}
