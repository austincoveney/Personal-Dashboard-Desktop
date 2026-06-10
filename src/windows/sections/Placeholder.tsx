import { Sparkles } from 'lucide-react';

export function Placeholder({ title }: { title: string }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-2 px-6 text-center">
      <Sparkles className="size-5 text-mint" />
      <p className="font-display text-lg">{title}</p>
      <p className="text-sm text-muted-foreground">
        Coming to the Deck soon. For now, open the dashboard for {title.toLowerCase()}.
      </p>
    </div>
  );
}
