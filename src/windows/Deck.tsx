import { useEffect, useState } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { Rail } from '@/components/Rail';
import { registerShortcuts } from '@/lib/bootstrap';
import { type SectionId } from '@/lib/sections';
import { Today } from '@/windows/sections/Today';
import { Placeholder } from '@/windows/sections/Placeholder';

const PLACEHOLDERS: Record<Exclude<SectionId, 'today'>, string> = {
  mood: 'Mood',
  tasks: 'Tasks',
  notes: 'Notes',
  sleep: 'Sleep',
  habits: 'Habits',
  life: 'Life',
};

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
        <div className="min-w-0 flex-1">
          {active === 'today' ? <Today /> : <Placeholder title={PLACEHOLDERS[active]} />}
        </div>
      </div>
    </div>
  );
}
