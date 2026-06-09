import { isTauri } from '@/lib/window';

export interface Settings {
  baseUrl: string;
  token: string;
  launchAtLogin: boolean;
  morningCheckin: boolean;
  shortcut: string;
  lastMorning: string; // YYYY-MM-DD the morning check-in was last shown
}

export const DEFAULT_SETTINGS: Settings = {
  baseUrl: 'https://austins.dashboard.digigrow.uk',
  token: '',
  launchAtLogin: true,
  morningCheckin: true,
  shortcut: 'CommandOrControl+Alt+Space',
  lastMorning: '',
};

const FILE = 'settings.json';
const LS_KEY = 'pdd.settings';

type TauriStore = {
  get<T>(key: string): Promise<T | undefined>;
  set(key: string, value: unknown): Promise<void>;
  save(): Promise<void>;
};

let storePromise: Promise<TauriStore> | null = null;

async function tauriStore(): Promise<TauriStore> {
  if (!storePromise) {
    storePromise = import('@tauri-apps/plugin-store').then((m) =>
      m.load(FILE, { autoSave: true, defaults: {} }) as unknown as Promise<TauriStore>,
    );
  }
  return storePromise;
}

export async function loadSettings(): Promise<Settings> {
  if (!isTauri()) {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : { ...DEFAULT_SETTINGS };
    } catch {
      return { ...DEFAULT_SETTINGS };
    }
  }
  const store = await tauriStore();
  const out: Settings = { ...DEFAULT_SETTINGS };
  for (const key of Object.keys(DEFAULT_SETTINGS) as (keyof Settings)[]) {
    const v = await store.get<Settings[typeof key]>(key);
    if (v !== undefined && v !== null) (out[key] as unknown) = v;
  }
  return out;
}

export async function saveSettings(patch: Partial<Settings>): Promise<void> {
  if (!isTauri()) {
    const current = await loadSettings();
    localStorage.setItem(LS_KEY, JSON.stringify({ ...current, ...patch }));
    return;
  }
  const store = await tauriStore();
  for (const [k, v] of Object.entries(patch)) {
    await store.set(k, v);
  }
  await store.save();
}
