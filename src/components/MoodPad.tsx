import { cn } from '@/lib/cn';
import { moodLabel } from '@/lib/format';

// valence -2..2 (left=rough, right=great), energy +2..-2 (top=wired, bottom=drained)
const ENERGY_ROWS = [2, 1, 0, -1, -2];
const VALENCE_COLS = [-2, -1, 0, 1, 2];

function cellColor(valence: number, energy: number, selected: boolean): string {
  // warm amber for high valence, cool for low; brighten the selected cell.
  const hue = 60 + valence * 8; // amber-ish, drift slightly
  const light = 0.3 + (energy + 2) * 0.04 + (valence + 2) * 0.02;
  const chroma = 0.06 + (valence + 2) * 0.015;
  const a = selected ? 1 : 0.55;
  return `oklch(${light.toFixed(3)} ${chroma.toFixed(3)} ${hue} / ${a})`;
}

export function MoodPad({
  valence,
  energy,
  onChange,
}: {
  valence: number | null;
  energy: number | null;
  onChange: (valence: number, energy: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-stretch gap-2">
        <div className="flex flex-col justify-between py-1 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
          <span>wired</span>
          <span>drained</span>
        </div>
        <div className="grid flex-1 grid-cols-5 grid-rows-5 gap-1.5">
          {ENERGY_ROWS.map((e) =>
            VALENCE_COLS.map((v) => {
              const selected = valence === v && energy === e;
              return (
                <button
                  key={`${v}-${e}`}
                  type="button"
                  aria-label={moodLabel(v, e)}
                  onClick={() => onChange(v, e)}
                  className={cn(
                    'no-drag aspect-square rounded-md transition-all duration-150',
                    selected ? 'glow-amber scale-[1.04] ring-1 ring-primary/60' : 'hover:scale-[1.03]',
                  )}
                  style={{ backgroundColor: cellColor(v, e, selected) }}
                />
              );
            }),
          )}
        </div>
      </div>
      <div className="flex items-center justify-between pl-7 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
        <span>rough</span>
        <span className="text-foreground">
          {valence !== null && energy !== null ? moodLabel(valence, energy) : 'pick how you feel'}
        </span>
        <span>great</span>
      </div>
    </div>
  );
}
