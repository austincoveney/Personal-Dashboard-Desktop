import { Download, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { checkForUpdate, type UpdateInfo } from '@/lib/updater';

export function UpdateBanner() {
  const [update, setUpdate] = useState<UpdateInfo | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void checkForUpdate().then(setUpdate);
  }, []);

  if (!update) return null;

  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
      <span className="flex items-center gap-2 text-xs">
        <Download className="size-3.5 shrink-0 text-primary" />
        Update <span className="font-medium text-foreground">v{update.version}</span> ready
      </span>
      <Button
        size="sm"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          try {
            await update.apply();
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : 'Install & restart'}
      </Button>
    </div>
  );
}
