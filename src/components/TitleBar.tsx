import { X } from 'lucide-react';
import { hideSelf } from '@/lib/win-actions';
import { cn } from '@/lib/cn';

export function TitleBar({ title, className }: { title?: string; className?: string }) {
  return (
    <div
      data-tauri-drag-region=""
      className={cn('flex h-9 shrink-0 items-center justify-between px-3', className)}
    >
      <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {title ?? "Austin's deck"}
      </span>
      <button
        type="button"
        onClick={hideSelf}
        aria-label="Close"
        className="no-drag grid size-6 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
