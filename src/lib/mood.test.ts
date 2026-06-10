import { describe, expect, it } from 'vitest';
import type { MoodSummary } from '@/lib/agent';
import { moodTrend, moodsOldestFirst, valenceBg } from '@/lib/mood';

const m = (valence: number, loggedAt: string): MoodSummary => ({ valence, energy: 0, loggedAt });

describe('moodsOldestFirst', () => {
  it('sorts by loggedAt ascending without mutating input', () => {
    const input = [m(2, '2026-06-10T08:00:00Z'), m(0, '2026-06-08T08:00:00Z'), m(1, '2026-06-09T08:00:00Z')];
    const out = moodsOldestFirst(input);
    expect(out.map((x) => x.loggedAt)).toEqual([
      '2026-06-08T08:00:00Z',
      '2026-06-09T08:00:00Z',
      '2026-06-10T08:00:00Z',
    ]);
    expect(input[0]?.loggedAt).toBe('2026-06-10T08:00:00Z');
  });
});

describe('moodTrend', () => {
  it('is up when the latest valence beats the previous', () => {
    expect(moodTrend([m(0, '2026-06-09T08:00:00Z'), m(2, '2026-06-10T08:00:00Z')])).toBe('up');
  });
  it('is down when the latest valence is lower', () => {
    expect(moodTrend([m(1, '2026-06-09T08:00:00Z'), m(-1, '2026-06-10T08:00:00Z')])).toBe('down');
  });
  it('is flat when equal', () => {
    expect(moodTrend([m(1, '2026-06-09T08:00:00Z'), m(1, '2026-06-10T08:00:00Z')])).toBe('flat');
  });
  it('is null with fewer than two entries', () => {
    expect(moodTrend([m(1, '2026-06-10T08:00:00Z')])).toBeNull();
    expect(moodTrend([])).toBeNull();
  });
});

describe('valenceBg', () => {
  it('maps valence to a tone token', () => {
    expect(valenceBg(2)).toBe('bg-mint');
    expect(valenceBg(1)).toBe('bg-mint');
    expect(valenceBg(0)).toBe('bg-muted-foreground');
    expect(valenceBg(-1)).toBe('bg-warning');
    expect(valenceBg(-2)).toBe('bg-warning');
  });
});
