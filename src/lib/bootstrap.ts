import { loadSettings } from '@/lib/settings';
import { showWindow } from '@/lib/win-actions';
import { isTauri } from '@/lib/window';

let done = false;

// Registered once, from the (always-loaded) glance window. Opens quick-capture
// from anywhere via the configured global hotkey.
export async function registerShortcuts(): Promise<void> {
  if (!isTauri() || done) return;
  done = true;
  try {
    const { register, unregisterAll } = await import('@tauri-apps/plugin-global-shortcut');
    const { shortcut } = await loadSettings();
    await unregisterAll();
    if (shortcut) {
      await register(shortcut, (event) => {
        if (event.state === 'Pressed') void showWindow('capture');
      });
    }
  } catch {
    done = false;
  }
}
