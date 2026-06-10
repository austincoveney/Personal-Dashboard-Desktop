import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type MoodSummary } from '@/lib/agent';

const history: MoodSummary[] = [
  { valence: 0, energy: 0, loggedAt: '2026-06-09T08:00:00Z' },
  { valence: 2, energy: 1, loggedAt: '2026-06-10T08:00:00Z' },
];

vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({
    data: { moodHistory: history, latestMood: history[1] },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('@/components/MoodPad', () => ({
  MoodPad: ({ onChange }: { valence: number | null; energy: number | null; onChange: (v: number, e: number) => void }) => (
    <button type="button" aria-label="great · wired" onClick={() => onChange(2, 2)} />
  ),
}));

import { Mood } from '@/windows/sections/Mood';

describe('Mood', () => {
  it('shows the recent count and the latest label', () => {
    render(<Mood />);
    expect(screen.getByText('Last 2')).toBeInTheDocument();
    expect(screen.getByText(/great/i)).toBeInTheDocument();
  });

  it('logs the picked mood via the agent', async () => {
    const spy = vi.spyOn(agent, 'logMood').mockResolvedValue({});
    render(<Mood />);
    await userEvent.click(screen.getByRole('button', { name: 'great · wired' }));
    await userEvent.click(screen.getByRole('button', { name: /Log mood/i }));
    expect(spy).toHaveBeenCalledWith(expect.objectContaining({ valence: 2, energy: 2 }));
  });
});
