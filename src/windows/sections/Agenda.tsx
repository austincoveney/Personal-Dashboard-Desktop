import type { DayBlock } from '@/lib/agent';
import { type BlockTone, blockIsNow, blockTone } from '@/lib/day-plan';
import { cn } from '@/lib/cn';

const TONE: Record<BlockTone, string> = {
  focus: 'bg-primary',
  break: 'bg-mint',
  event: 'bg-foreground',
  muted: 'bg-muted-foreground',
};

export function Agenda({
  narrative,
  blocks,
  now = new Date(),
}: {
  narrative: string | null;
  blocks: DayBlock[];
  now?: Date;
}) {
  if (!narrative && blocks.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No plan set yet — Jarvis or the dashboard builds one.</p>
    );
  }
  const nowMin = now.getHours() * 60 + now.getMinutes();
  return (
    <div className="space-y-3">
      {narrative && (
        <p className="font-display text-base leading-snug text-foreground/90">{narrative}</p>
      )}
      {blocks.length > 0 && (
        <ul className="space-y-1">
          {blocks.map((b, i) => {
            const active = blockIsNow(b, nowMin);
            return (
              <li
                key={`${b.start}-${i}`}
                className={cn(
                  'flex items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors',
                  active && 'glow-amber bg-surface-2',
                )}
              >
                <span className="tnum w-12 shrink-0 font-mono text-[11px] text-muted-foreground">
                  {b.start}
                </span>
                <span className={cn('size-1.5 shrink-0 rounded-full', TONE[blockTone(b.type)])} />
                <span className="min-w-0 flex-1 truncate text-sm">{b.title}</span>
                {active && (
                  <span className="shrink-0 rounded-full bg-primary/15 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">
                    now
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
