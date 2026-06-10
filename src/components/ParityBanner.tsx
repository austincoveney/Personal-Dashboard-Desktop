import { GitCompareArrows } from 'lucide-react';
import { useEffect, useState } from 'react';
import { checkParity, type ParityResult } from '@/lib/parity';

export function ParityBanner() {
  const [p, setP] = useState<ParityResult | null>(null);

  useEffect(() => {
    void checkParity().then(setP);
  }, []);

  if (!p || !p.behind || p.missing.length === 0) return null;

  return (
    <div className="rounded-lg border border-warning/30 bg-warning/10 px-3 py-2">
      <p className="flex items-center gap-2 text-xs font-medium">
        <GitCompareArrows className="size-3.5 shrink-0 text-warning" />
        Behind the dashboard ({p.missing.length} not yet native here)
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
        {p.missing.map((m) => m.name).join(', ')}
      </p>
    </div>
  );
}
