import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type SleepSummary } from '@/lib/agent';

const history: SleepSummary[] = [
  { id: 7, on: '2026-06-10', bedtime: '23:00', wakeTime: '07:00', asleepMin: 480, quality: 4, note: null, source: 'self' },
];

describe('Sleep', () => {
  it('shows recent nights from history', async () => {
    vi.spyOn(agent, 'getSleepHistory').mockResolvedValue(history);
    const { Sleep } = await import('@/windows/sections/Sleep');
    render(<Sleep />);
    expect(await screen.findByText('8h')).toBeInTheDocument();
  });

  it('logs a night with the computed duration', async () => {
    vi.spyOn(agent, 'getSleepHistory').mockResolvedValue([]);
    const log = vi.spyOn(agent, 'logSleep').mockResolvedValue({});
    const { Sleep } = await import('@/windows/sections/Sleep');
    render(<Sleep />);
    fireEvent.change(screen.getByLabelText('Bedtime'), { target: { value: '23:00' } });
    fireEvent.change(screen.getByLabelText('Wake time'), { target: { value: '07:00' } });
    await userEvent.click(screen.getByRole('button', { name: 'Quality 4' }));
    await userEvent.click(screen.getByRole('button', { name: /Log sleep/i }));
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ bedtime: '23:00', wakeTime: '07:00', asleepMin: 480, quality: 4 }),
    );
  });

  it('deletes a night', async () => {
    vi.spyOn(agent, 'getSleepHistory').mockResolvedValue(history);
    const del = vi.spyOn(agent, 'deleteSleep').mockResolvedValue({});
    const { Sleep } = await import('@/windows/sections/Sleep');
    render(<Sleep />);
    await screen.findByText('8h');
    await userEvent.click(screen.getByRole('button', { name: /Delete/ }));
    await waitFor(() => expect(del).toHaveBeenCalledWith(7));
  });
});
