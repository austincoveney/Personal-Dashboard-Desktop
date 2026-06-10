import type { TaskSummary } from '@/lib/agent';

export type Priority = TaskSummary['priority'];

const ORDER: Priority[] = ['none', 'low', 'med', 'high', 'urgent'];

export function nextPriority(p: Priority): Priority {
  const i = ORDER.indexOf(p);
  return ORDER[(i + 1) % ORDER.length] ?? 'none';
}

export function priorityTone(p: Priority): string {
  switch (p) {
    case 'urgent':
      return 'text-destructive';
    case 'high':
      return 'text-warning';
    case 'med':
      return 'text-primary';
    case 'low':
      return 'text-mint';
    default:
      return 'text-muted-foreground';
  }
}
