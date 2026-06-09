const VAL = ['rough', 'low', 'okay', 'good', 'great'];
const ENE = ['drained', 'tired', 'steady', 'lively', 'wired'];

const clampIdx = (n: number) => Math.max(0, Math.min(4, n + 2));

export function moodLabel(valence: number, energy: number | null): string {
  const v = VAL[clampIdx(valence)] ?? 'okay';
  if (energy === null || energy === undefined) return v;
  const e = ENE[clampIdx(energy)] ?? 'steady';
  return `${v} · ${e}`;
}

export function moodTone(valence: number): string {
  if (valence >= 1) return 'text-mint';
  if (valence <= -1) return 'text-warning';
  return 'text-foreground';
}

export function fmtDur(min: number | null | undefined): string {
  if (min == null) return '—';
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

export function greeting(d = new Date()): string {
  const h = d.getHours();
  if (h < 12) return 'Good morning';
  if (h < 18) return 'Good afternoon';
  return 'Good evening';
}

export function todayIso(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function longDate(d = new Date()): string {
  return d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' });
}
