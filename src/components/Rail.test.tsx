import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Rail } from '@/components/Rail';

describe('Rail', () => {
  it('renders a button per section and marks the active one', () => {
    render(<Rail active="mood" onSelect={() => {}} />);
    expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mood' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByRole('button', { name: 'Tasks' })).not.toHaveAttribute('aria-current');
  });

  it('emits the section id when a rail item is clicked', async () => {
    const onSelect = vi.fn();
    render(<Rail active="today" onSelect={onSelect} />);
    await userEvent.click(screen.getByRole('button', { name: 'Sleep' }));
    expect(onSelect).toHaveBeenCalledWith('sleep');
  });
});
