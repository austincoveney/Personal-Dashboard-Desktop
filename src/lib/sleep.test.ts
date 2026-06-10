import { describe, expect, it } from 'vitest';
import { shortNight, sleepDuration } from '@/lib/sleep';

describe('sleepDuration', () => {
  it('computes a normal overnight span', () => {
    expect(sleepDuration('23:00', '07:00')).toBe(480);
    expect(sleepDuration('22:30', '06:00')).toBe(450);
  });
  it('corrects the 12:00-means-midnight mixup (no phantom 19h night)', () => {
    expect(sleepDuration('12:00', '07:00')).toBe(420);
  });
  it('returns null for unparseable times', () => {
    expect(sleepDuration('', '07:00')).toBeNull();
    expect(sleepDuration('23:00', 'nope')).toBeNull();
  });
});

describe('shortNight', () => {
  it('formats an iso date to a short weekday+day', () => {
    expect(shortNight('2026-06-10')).toMatch(/\d/);
  });
  it('returns the input when it is not a valid iso date', () => {
    expect(shortNight('garbage')).toBe('garbage');
  });
});
