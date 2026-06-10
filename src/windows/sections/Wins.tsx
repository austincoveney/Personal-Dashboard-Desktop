import { Sparkle } from 'lucide-react';

export function Wins({ wins }: { wins: { id: number; title: string; achievedOn: string }[] }) {
  if (wins.length === 0) return null;
  return (
    <div className="space-y-1.5">
      <p className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-widest text-muted-foreground">
        <Sparkle className="size-3 text-mint" /> Wins today
      </p>
      {wins.map((w) => (
        <p key={w.id} className="flex items-start gap-2 text-sm">
          <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-mint" />
          <span className="min-w-0">{w.title}</span>
        </p>
      ))}
    </div>
  );
}
