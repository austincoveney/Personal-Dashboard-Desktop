import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import { TitleBar } from '@/components/TitleBar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/cn';
import { DEFAULT_SETTINGS, loadSettings, saveSettings, type Settings as S } from '@/lib/settings';
import { testConnection } from '@/lib/agent';
import { checkForUpdate } from '@/lib/updater';
import { isTauri } from '@/lib/window';

export function Settings() {
  const [form, setForm] = useState<S>(DEFAULT_SETTINGS);
  const [loaded, setLoaded] = useState(false);
  const [saved, setSaved] = useState(false);
  const [test, setTest] = useState<{ state: 'idle' | 'busy' | 'ok' | 'fail'; message: string }>({
    state: 'idle',
    message: '',
  });
  const [upd, setUpd] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' });

  async function checkUpdate() {
    setUpd({ busy: true, msg: 'Checking…' });
    const u = await checkForUpdate();
    setUpd({
      busy: false,
      msg: u ? `v${u.version} ready — open the deck to install.` : 'You’re on the latest version.',
    });
  }

  useEffect(() => {
    void loadSettings().then((s) => {
      setForm(s);
      setLoaded(true);
    });
  }, []);

  function set<K extends keyof S>(key: K, value: S[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setSaved(false);
  }

  async function applyAutostart(on: boolean) {
    if (!isTauri()) return;
    try {
      const m = await import('@tauri-apps/plugin-autostart');
      on ? await m.enable() : await m.disable();
    } catch {
      // non-fatal
    }
  }

  async function save() {
    await saveSettings(form);
    await applyAutostart(form.launchAtLogin);
    setSaved(true);
  }

  async function runTest() {
    setTest({ state: 'busy', message: 'Connecting…' });
    await saveSettings({ baseUrl: form.baseUrl, token: form.token });
    const r = await testConnection();
    setTest({ state: r.ok ? 'ok' : 'fail', message: r.message });
  }

  if (!loaded) return <div className="app-shell" />;

  return (
    <div className="app-shell flex h-full flex-col">
      <TitleBar title="Settings" />
      <div className="flex-1 space-y-5 overflow-y-auto px-6 pb-4">
        <header className="space-y-1">
          <h1 className="font-display text-xl tracking-tight">Settings</h1>
          <p className="text-sm text-muted-foreground">Point the app at your dashboard, then test it.</p>
        </header>

        <Field label="Dashboard URL" hint="The public address of your web dashboard.">
          <input
            value={form.baseUrl}
            onChange={(e) => set('baseUrl', e.target.value)}
            placeholder="https://austins.dashboard.digigrow.uk"
            className={inputCls}
          />
        </Field>

        <Field label="Agent token" hint="The AGENT_API_TOKEN from the dashboard's .env.local. Stored locally, never synced.">
          <input
            value={form.token}
            onChange={(e) => set('token', e.target.value)}
            type="password"
            placeholder="agent_…"
            className={cn(inputCls, 'font-mono')}
          />
        </Field>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="secondary" onClick={runTest} disabled={test.state === 'busy'}>
            {test.state === 'busy' && <Loader2 className="size-3.5 animate-spin" />}
            Test connection
          </Button>
          {test.state === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-mint">
              <CheckCircle2 className="size-3.5" /> {test.message}
            </span>
          )}
          {test.state === 'fail' && (
            <span className="flex items-center gap-1 text-xs text-destructive">
              <XCircle className="size-3.5" /> {test.message}
            </span>
          )}
        </div>

        <Toggle
          label="Launch at login"
          hint="Start quietly in the tray when Windows boots."
          checked={form.launchAtLogin}
          onChange={(v) => set('launchAtLogin', v)}
        />
        <Toggle
          label="Morning check-in"
          hint="On the first launch each day, ask how it's shaping up."
          checked={form.morningCheckin}
          onChange={(v) => set('morningCheckin', v)}
        />

        <Field label="Quick-capture shortcut" hint="Global hotkey to open quick capture from anywhere.">
          <input
            value={form.shortcut}
            onChange={(e) => set('shortcut', e.target.value)}
            placeholder="CommandOrControl+Alt+Space"
            className={cn(inputCls, 'font-mono')}
          />
        </Field>

        <div className="space-y-2">
          <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
            Updates
          </p>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="secondary" onClick={checkUpdate} disabled={upd.busy}>
              {upd.busy && <Loader2 className="size-3.5 animate-spin" />} Check for updates
            </Button>
            {upd.msg && <span className="text-xs text-muted-foreground">{upd.msg}</span>}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 border-t border-border px-6 py-3">
        {saved && <span className="mr-auto text-xs text-mint">Saved. Restart applies the shortcut.</span>}
        <Button size="sm" onClick={save}>
          Save
        </Button>
      </div>
    </div>
  );
}

const inputCls =
  'h-10 w-full rounded-md border border-input bg-surface/50 px-3 text-sm outline-none focus:border-border-strong';

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
        {label}
      </label>
      {children}
      {hint && <p className="text-[11px] leading-relaxed text-muted-foreground">{hint}</p>}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="no-drag flex w-full items-center justify-between gap-3 text-left"
    >
      <span className="space-y-0.5">
        <span className="block text-sm">{label}</span>
        {hint && <span className="block text-[11px] text-muted-foreground">{hint}</span>}
      </span>
      <span
        className={cn(
          'relative h-6 w-10 shrink-0 rounded-full transition-colors',
          checked ? 'bg-primary' : 'bg-surface-2',
        )}
      >
        <span
          className={cn(
            'absolute top-0.5 size-5 rounded-full bg-background transition-transform',
            checked ? 'translate-x-[1.125rem]' : 'translate-x-0.5',
          )}
        />
      </span>
    </button>
  );
}
