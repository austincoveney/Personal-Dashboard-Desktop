import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type HabitSummary } from '@/lib/agent';

const habits: HabitSummary[] = [
  { id: 1, name: 'Read', cadence: 'daily', target: null, doneToday: false, streak: 4 },
  { id: 2, name: 'Stretch', cadence: 'daily', target: null, doneToday: true, streak: 9 },
];

vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({
    data: { habits },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { Habits } from '@/windows/sections/Habits';

describe('Habits', () => {
  it('lists habits with their streak and the done count', () => {
    render(<Habits />);
    expect(screen.getByText('Read')).toBeInTheDocument();
    expect(screen.getByText('Stretch')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
    expect(screen.getByText('1/2')).toBeInTheDocument();
  });

  it('checks in a not-yet-done habit', async () => {
    const spy = vi.spyOn(agent, 'checkInHabit').mockResolvedValue({});
    render(<Habits />);
    await userEvent.click(screen.getByRole('button', { name: /Read/ }));
    expect(spy).toHaveBeenCalledWith({ habitId: 1, done: true });
  });

  it('un-checks an already-done habit', async () => {
    const spy = vi.spyOn(agent, 'checkInHabit').mockResolvedValue({});
    render(<Habits />);
    await userEvent.click(screen.getByRole('button', { name: /Stretch/ }));
    expect(spy).toHaveBeenCalledWith({ habitId: 2, done: false });
  });
});
