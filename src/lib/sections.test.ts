import { describe, expect, it } from 'vitest';
import { SECTIONS, isSectionId } from '@/lib/sections';

describe('sections model', () => {
  it('starts with Today and lists all seven sections in order', () => {
    expect(SECTIONS.map((s) => s.id)).toEqual([
      'today',
      'mood',
      'tasks',
      'notes',
      'sleep',
      'habits',
      'life',
    ]);
  });

  it('gives every section a non-empty label and an icon', () => {
    for (const s of SECTIONS) {
      expect(s.label.length).toBeGreaterThan(0);
      expect(s.icon).toBeTruthy();
    }
  });

  it('guards known ids and rejects unknown ones', () => {
    expect(isSectionId('mood')).toBe(true);
    expect(isSectionId('today')).toBe(true);
    expect(isSectionId('journal')).toBe(false);
    expect(isSectionId('')).toBe(false);
  });
});
