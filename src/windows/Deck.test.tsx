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
    await userEvent.click(screen.getByRole('button', { name: 'Notes' }));
    expect(screen.getByText('Notes', { selector: 'p.font-display' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /Austin\./ })).not.toBeInTheDocument();
  });
});
