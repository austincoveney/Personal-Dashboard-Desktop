import { SECTIONS, type SectionId } from '@/lib/sections';
import { cn } from '@/lib/cn';

export function Rail({
  active,
  onSelect,
}: {
  active: SectionId;
  onSelect: (id: SectionId) => void;
}) {
  return (
    <nav
      aria-label="Sections"
      className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border py-2"
    >
      {SECTIONS.map(({ id, label, icon: Icon }) => {
        const isActive = id === active;
        return (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            aria-label={label}
            title={label}
            aria-current={isActive ? 'page' : undefined}
            className={cn(
              'no-drag grid size-9 place-items-center rounded-lg transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/60',
              isActive
                ? 'bg-accent text-primary'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <Icon className="size-4" />
          </button>
        );
      })}
    </nav>
  );
}
