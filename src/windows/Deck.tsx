import { useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { Rail } from '@/components/Rail';
import { registerShortcuts } from '@/lib/bootstrap';
import { SECTIONS, type SectionId } from '@/lib/sections';
import { Today } from '@/windows/sections/Today';
import { Mood } from '@/windows/sections/Mood';
import { Habits } from '@/windows/sections/Habits';
import { Sleep } from '@/windows/sections/Sleep';
import { Tasks } from '@/windows/sections/Tasks';
import { Notes } from '@/windows/sections/Notes';
import { Placeholder } from '@/windows/sections/Placeholder';

function sectionView(id: SectionId): ReactElement {
  switch (id) {
    case 'today':
      return <Today />;
    case 'mood':
      return <Mood />;
    case 'habits':
      return <Habits />;
    case 'tasks':
      return <Tasks />;
    case 'sleep':
      return <Sleep />;
    case 'notes':
      return <Notes />;
    default:
      return <Placeholder title={SECTIONS.find((s) => s.id === id)?.label ?? ''} />;
  }
}

export function Deck() {
  const [active, setActive] = useState<SectionId>('today');

  useEffect(() => {
    void registerShortcuts();
  }, []);

  return (
    <div className="app-shell flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 flex-1">
        <Rail active={active} onSelect={setActive} />
        <div className="min-w-0 flex-1">{sectionView(active)}</div>
      </div>
    </div>
  );
}
