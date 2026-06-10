import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { agent, type TaskSummary } from '@/lib/agent';

const tasks: TaskSummary[] = [
  { id: 1, title: 'Ship tasks', status: 'open', priority: 'none', focus: false, dueDate: null, source: 'self' },
  { id: 2, title: 'Reply to Zach', status: 'open', priority: 'high', focus: true, dueDate: null, source: 'self' },
];

vi.mock('@/lib/use-context', () => ({
  useAgentContext: () => ({
    data: { openTasks: tasks },
    error: null,
    loading: false,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

import { Tasks } from '@/windows/sections/Tasks';

describe('Tasks', () => {
  it('lists open tasks with the count', () => {
    render(<Tasks />);
    expect(screen.getByText('Ship tasks')).toBeInTheDocument();
    expect(screen.getByText('Reply to Zach')).toBeInTheDocument();
    expect(screen.getByText('· 2')).toBeInTheDocument();
  });

  it('completes a task', async () => {
    const spy = vi.spyOn(agent, 'updateTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Complete Ship tasks' }));
    expect(spy).toHaveBeenCalledWith(1, { status: 'done' });
  });

  it('cycles a task priority', async () => {
    const spy = vi.spyOn(agent, 'updateTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Priority none' }));
    expect(spy).toHaveBeenCalledWith(1, { priority: 'low' });
  });

  it('toggles focus', async () => {
    const spy = vi.spyOn(agent, 'updateTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Unfocus' }));
    expect(spy).toHaveBeenCalledWith(2, { focus: false });
  });

  it('deletes a task', async () => {
    const spy = vi.spyOn(agent, 'deleteTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.click(screen.getByRole('button', { name: 'Delete Ship tasks' }));
    expect(spy).toHaveBeenCalledWith(1);
  });

  it('adds a task', async () => {
    const spy = vi.spyOn(agent, 'addTask').mockResolvedValue({});
    render(<Tasks />);
    await userEvent.type(screen.getByPlaceholderText('Add a task…'), 'New thing');
    await userEvent.click(screen.getByRole('button', { name: 'Add task' }));
    expect(spy).toHaveBeenCalledWith({ title: 'New thing' });
  });
});
