import { describe, expect, it } from 'vitest';
import { nextPriority, priorityTone } from '@/lib/tasks';

describe('nextPriority', () => {
  it('cycles none → low → med → high → urgent → none', () => {
    expect(nextPriority('none')).toBe('low');
    expect(nextPriority('low')).toBe('med');
    expect(nextPriority('med')).toBe('high');
    expect(nextPriority('high')).toBe('urgent');
    expect(nextPriority('urgent')).toBe('none');
  });
});

describe('priorityTone', () => {
  it('gives each priority a token class', () => {
    expect(priorityTone('urgent')).toBe('text-destructive');
    expect(priorityTone('high')).toBe('text-warning');
    expect(priorityTone('med')).toBe('text-primary');
    expect(priorityTone('low')).toBe('text-mint');
    expect(priorityTone('none')).toBe('text-muted-foreground');
  });
});
