import { describe, expect, it } from 'vitest';
import type { DayBlock } from '@/lib/agent';
import { blockIsNow, blockTone, parseHm } from '@/lib/day-plan';

const block = (over: Partial<DayBlock>): DayBlock => ({
  start: '09:00',
  end: '10:00',
  title: 'Focus',
  type: 'focus',
  note: null,
  taskId: null,
  ...over,
});

describe('parseHm', () => {
  it('parses HH:MM to minutes', () => {
    expect(parseHm('09:30')).toBe(570);
    expect(parseHm('00:00')).toBe(0);
    expect(parseHm('23:59')).toBe(1439);
  });
  it('returns null for junk or empty', () => {
    expect(parseHm('')).toBeNull();
    expect(parseHm(null)).toBeNull();
    expect(parseHm('nope')).toBeNull();
    expect(parseHm('25:00')).toBeNull();
  });
});

describe('blockIsNow', () => {
  it('is true only inside [start, end)', () => {
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 570)).toBe(true);
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 600)).toBe(false);
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 540)).toBe(true);
    expect(blockIsNow(block({ start: '09:00', end: '10:00' }), 480)).toBe(false);
  });
  it('is false when end is missing or unparseable', () => {
    expect(blockIsNow(block({ start: '09:00', end: null }), 570)).toBe(false);
  });
});

describe('blockTone', () => {
  it('maps block types to tones', () => {
    expect(blockTone('focus')).toBe('focus');
    expect(blockTone('break')).toBe('break');
    expect(blockTone('event')).toBe('event');
    expect(blockTone('task')).toBe('muted');
    expect(blockTone('admin')).toBe('muted');
  });
});
