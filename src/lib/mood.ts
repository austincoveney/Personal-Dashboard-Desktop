import type { MoodSummary } from '@/lib/agent';

export function moodsOldestFirst(history: MoodSummary[]): MoodSummary[] {
  return [...history].sort((a, b) => (a.loggedAt ?? '').localeCompare(b.loggedAt ?? ''));
}

export function moodTrend(history: MoodSummary[]): 'up' | 'down' | 'flat' | null {
  const ordered = moodsOldestFirst(history);
  if (ordered.length < 2) return null;
  const latest = ordered[ordered.length - 1];
  const prev = ordered[ordered.length - 2];
  if (!latest || !prev) return null;
  if (latest.valence > prev.valence) return 'up';
  if (latest.valence < prev.valence) return 'down';
  return 'flat';
}

export function valenceBg(valence: number): string {
  if (valence >= 1) return 'bg-mint';
  if (valence <= -1) return 'bg-warning';
  return 'bg-muted-foreground';
}
