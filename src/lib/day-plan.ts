import type { DayBlock } from '@/lib/agent';

export function parseHm(value: string | null | undefined): number | null {
  if (!value) return null;
  const m = /^(\d{1,2}):(\d{2})/.exec(value.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min) || h > 23 || min > 59) return null;
  return h * 60 + min;
}

export function blockIsNow(block: DayBlock, nowMin: number): boolean {
  const start = parseHm(block.start);
  const end = parseHm(block.end);
  if (start == null || end == null) return false;
  return nowMin >= start && nowMin < end;
}

export type BlockTone = 'focus' | 'break' | 'event' | 'muted';

export function blockTone(type: DayBlock['type']): BlockTone {
  if (type === 'focus') return 'focus';
  if (type === 'break') return 'break';
  if (type === 'event') return 'event';
  return 'muted';
}
