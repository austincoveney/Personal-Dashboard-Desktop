import { loadSettings } from '@/lib/settings';
import { isTauri } from '@/lib/window';

export async function showWindow(label: string): Promise<void> {
  if (!isTauri()) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const w = await WebviewWindow.getByLabel(label);
  if (w) {
    await w.show();
    await w.unminimize();
    await w.setFocus();
  }
}

export async function hideSelf(): Promise<void> {
  if (!isTauri()) {
    window.close();
    return;
  }
  const { getCurrentWindow } = await import('@tauri-apps/api/window');
  await getCurrentWindow().hide();
}

export async function openDashboard(): Promise<void> {
  const { baseUrl } = await loadSettings();
  if (!isTauri()) {
    window.open(baseUrl, '_blank');
    return;
  }
  const { openUrl } = await import('@tauri-apps/plugin-opener');
  await openUrl(baseUrl);
}

export async function toggleWidget(): Promise<void> {
  if (!isTauri()) return;
  const { WebviewWindow } = await import('@tauri-apps/api/webviewWindow');
  const w = await WebviewWindow.getByLabel('widget');
  if (!w) return;
  (await w.isVisible()) ? await w.hide() : (await w.show(), await w.setFocus());
}
