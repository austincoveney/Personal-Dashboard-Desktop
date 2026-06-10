import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Wins } from '@/windows/sections/Wins';

describe('Wins', () => {
  it('lists each win title', () => {
    render(
      <Wins
        wins={[
          { id: 1, title: 'Shipped parity system', achievedOn: '2026-06-10' },
          { id: 2, title: 'Cleared the deck', achievedOn: '2026-06-10' },
        ]}
      />,
    );
    expect(screen.getByText('Wins today')).toBeInTheDocument();
    expect(screen.getByText('Shipped parity system')).toBeInTheDocument();
    expect(screen.getByText('Cleared the deck')).toBeInTheDocument();
  });

  it('renders nothing when there are no wins', () => {
    render(<Wins wins={[]} />);
    expect(screen.queryByText('Wins today')).not.toBeInTheDocument();
  });
});
