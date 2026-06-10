import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type NoteSummary } from '@/lib/agent';

const notes: NoteSummary[] = [
  { id: 1, title: 'Groceries', body: 'milk, eggs', pinned: false, updatedAt: '2026-06-10T08:00:00Z' },
  { id: 2, title: 'Ideas', body: '', pinned: true, updatedAt: '2026-06-09T08:00:00Z' },
];

describe('Notes', () => {
  it('lists notes', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    expect(await screen.findByText('Groceries')).toBeInTheDocument();
    expect(screen.getByText('Ideas')).toBeInTheDocument();
  });

  it('creates a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue([]);
    const spy = vi.spyOn(agent, 'addNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await userEvent.type(screen.getByLabelText('Note title'), 'New');
    await userEvent.click(screen.getByRole('button', { name: 'Add note' }));
    expect(spy).toHaveBeenCalledWith({ title: 'New', body: '' });
  });

  it('toggles pin on a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const spy = vi.spyOn(agent, 'updateNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await screen.findByText('Groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(spy).toHaveBeenCalledWith(1, { pinned: true });
  });

  it('edits a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const spy = vi.spyOn(agent, 'updateNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await screen.findByText('Groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Edit Groceries' }));
    await userEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(spy).toHaveBeenCalledWith(1, expect.objectContaining({ title: 'Groceries' }));
  });

  it('deletes a note', async () => {
    vi.spyOn(agent, 'getNotes').mockResolvedValue(notes);
    const spy = vi.spyOn(agent, 'deleteNote').mockResolvedValue({});
    const { Notes } = await import('@/windows/sections/Notes');
    render(<Notes />);
    await screen.findByText('Groceries');
    await userEvent.click(screen.getByRole('button', { name: 'Delete Groceries' }));
    expect(spy).toHaveBeenCalledWith(1);
  });
});
