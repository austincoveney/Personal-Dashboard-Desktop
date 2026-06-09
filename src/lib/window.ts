// Which screen a window renders is decided by its Tauri window label.
// In a plain browser (vite dev without Tauri) we fall back to a ?w= query param.

export type ScreenLabel = 'glance' | 'morning' | 'capture' | 'settings' | 'widget';

const SCREENS: ScreenLabel[] = ['glance', 'morning', 'capture', 'settings', 'widget'];

export function isTauri(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

export function currentScreen(): ScreenLabel {
  if (isTauri()) {
    try {
      const internals = (window as unknown as { __TAURI_INTERNALS__?: { metadata?: { currentWindow?: { label?: string } } } })
        .__TAURI_INTERNALS__;
      const label = internals?.metadata?.currentWindow?.label;
      if (label && (SCREENS as string[]).includes(label)) return label as ScreenLabel;
    } catch {
      // fall through
    }
  }
  const q = new URLSearchParams(window.location.search).get('w');
  if (q && (SCREENS as string[]).includes(q)) return q as ScreenLabel;
  return 'glance';
}
