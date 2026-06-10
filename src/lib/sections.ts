import {
  BookHeart,
  CheckSquare,
  Home,
  type LucideIcon,
  Moon,
  NotebookPen,
  SmilePlus,
  Target,
} from 'lucide-react';

export type SectionId = 'today' | 'mood' | 'tasks' | 'notes' | 'sleep' | 'habits' | 'life';

export interface SectionDef {
  id: SectionId;
  label: string;
  icon: LucideIcon;
}

export const SECTIONS: SectionDef[] = [
  { id: 'today', label: 'Today', icon: Home },
  { id: 'mood', label: 'Mood', icon: SmilePlus },
  { id: 'tasks', label: 'Tasks', icon: CheckSquare },
  { id: 'notes', label: 'Notes', icon: NotebookPen },
  { id: 'sleep', label: 'Sleep', icon: Moon },
  { id: 'habits', label: 'Habits', icon: Target },
  { id: 'life', label: 'Life', icon: BookHeart },
];

const IDS = new Set<string>(SECTIONS.map((s) => s.id));

export function isSectionId(value: string): value is SectionId {
  return IDS.has(value);
}
