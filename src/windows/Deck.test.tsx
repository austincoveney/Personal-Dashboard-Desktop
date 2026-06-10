import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/bootstrap', () => ({ registerShortcuts: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({ data: null, error: null, loading: false, refresh: vi.fn() }),
}));
vi.mock('@/components/ParityBanner', () => ({ ParityBanner: () => null }));
vi.mock('@/components/UpdateBanner', () => ({ UpdateBanner: () => null }));

import { Deck } from '@/windows/Deck';

describe('Deck', () => {
  it('shows Today by default', () => {
    render(<Deck />);
    expect(screen.getByRole('heading', { name: /Austin\./ })).toBeInTheDocument();
  });

  it('switches to a placeholder section when its rail item is clicked', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Life' }));
    expect(screen.getByText('Life', { selector: 'p.font-display' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Austin\./ })).not.toBeInTheDocument();
  });

  it('renders the Mood section when Mood is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Mood' }));
    expect(screen.getByRole('heading', { name: 'Log a mood' })).toBeInTheDocument();
  });

  it('renders the Habits section when Habits is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Habits' }));
    expect(screen.getByRole('heading', { name: /Habits/ })).toBeInTheDocument();
  });

  it('renders the Tasks section when Tasks is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Tasks' }));
    expect(screen.getByRole('heading', { name: /Tasks/ })).toBeInTheDocument();
  });

  it('renders the Sleep section when Sleep is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(screen.getByRole('heading', { name: 'Log sleep' })).toBeInTheDocument();
  });

  it('renders the Notes section when Notes is selected', async () => {
    render(<Deck />);
    await userEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByRole('heading', { name: 'Notes' })).toBeInTheDocument();
  });
});
