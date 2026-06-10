import { parseHm } from '@/lib/day-plan';

const DAY = 1440;

export function sleepDuration(bedtime: string, wakeTime: string): number | null {
  const bed = parseHm(bedtime);
  const wake = parseHm(wakeTime);
  if (bed == null || wake == null) return null;
  let dur = (wake - bed + DAY) % DAY;
  if (dur > 14 * 60) {
    const flipped = (wake - ((bed + 12 * 60) % DAY) + DAY) % DAY;
    if (flipped <= 14 * 60) dur = flipped;
  }
  return dur;
}

export function shortNight(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric' });
}
