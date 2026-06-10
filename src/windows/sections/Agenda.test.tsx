import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { DayBlock } from '@/lib/agent';
import { Agenda } from '@/windows/sections/Agenda';

const blocks: DayBlock[] = [
  { start: '09:00', end: '10:00', title: 'Ship the Deck', type: 'focus', note: null, taskId: null },
  { start: '14:00', end: '15:00', title: 'Call Zach', type: 'event', note: null, taskId: null },
];

describe('Agenda', () => {
  it('renders the narrative and each block title and start time', () => {
    render(<Agenda narrative="Deep-work morning." blocks={blocks} now={new Date(2020, 0, 1, 8, 0)} />);
    expect(screen.getByText('Deep-work morning.')).toBeInTheDocument();
    expect(screen.getByText('Ship the Deck')).toBeInTheDocument();
    expect(screen.getByText('Call Zach')).toBeInTheDocument();
    expect(screen.getByText('09:00')).toBeInTheDocument();
  });

  it('marks the block that contains now', () => {
    render(<Agenda narrative={null} blocks={blocks} now={new Date(2020, 0, 1, 9, 30)} />);
    expect(screen.getByText('now')).toBeInTheDocument();
  });

  it('does not mark any block when now is outside every block', () => {
    render(<Agenda narrative={null} blocks={blocks} now={new Date(2020, 0, 1, 12, 0)} />);
    expect(screen.queryByText('now')).not.toBeInTheDocument();
  });

  it('shows a quiet empty state when there is no plan', () => {
    render(<Agenda narrative={null} blocks={[]} now={new Date(2020, 0, 1, 9, 0)} />);
    expect(screen.getByText(/No plan set yet/i)).toBeInTheDocument();
  });
});
