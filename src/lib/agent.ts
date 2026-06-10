import { loadSettings } from '@/lib/settings';
import { isTauri } from '@/lib/window';

// ---- Contract types (mirror /api/agent on the web dashboard) ----

export interface MoodSummary {
  valence: number;
  energy: number | null;
  tags?: string[];
  factors?: Record<string, unknown>;
  note?: string | null;
  source?: string;
  prompt?: string | null;
  loggedAt?: string;
}

export interface SleepSummary {
  id: number;
  on: string;
  bedtime: string | null;
  wakeTime: string | null;
  asleepMin: number | null;
  quality: number | null;
  note: string | null;
  source: string;
}

export interface TaskSummary {
  id: number;
  title: string;
  status: string;
  priority: 'none' | 'low' | 'med' | 'high' | 'urgent';
  focus: boolean;
  dueDate: string | null;
  source: string;
}

export interface HabitSummary {
  id: number;
  name: string;
  cadence: string;
  target: number | null;
  doneToday: boolean;
  streak: number;
}

export interface HabitCheckinInput {
  habitId: number;
  done: boolean;
}

export interface DayBlock {
  start: string;
  end: string | null;
  title: string;
  type: 'event' | 'focus' | 'break' | 'task' | 'admin';
  note: string | null;
  taskId: number | null;
}

export interface AgentContext {
  date: string;
  latestMood: MoodSummary | null;
  moodHistory: MoodSummary[];
  latestSleep: SleepSummary | null;
  openTasks: TaskSummary[];
  achievementsToday: { id: number; title: string; achievedOn: string }[];
  dayPlan: { planDate: string; narrative: string | null; blocks: DayBlock[] } | null;
  journalToday: { entryDate: string; body: string } | null;
  promptsToday: { id: number; entryDate: string; kind: string; prompt: string; answer: string | null }[];
  now: { statement: string; updatedAt: string } | null;
  reading: { id: number; title: string; author: string | null; status: string }[];
  habits: HabitSummary[];
}

export interface MoodInput {
  valence: number;
  energy?: number;
  tags?: string[];
  factors?: Record<string, unknown>;
  note?: string;
  prompt?: string;
  source?: 'self' | 'jarvis';
}

export interface SleepInput {
  on?: string;
  bedtime?: string;
  wakeTime?: string;
  asleepMin?: number;
  inBedMin?: number;
  quality?: number;
  note?: string;
  source?: 'self' | 'jarvis' | 'shortcut';
}

export interface TaskInput {
  title: string;
  detail?: string;
  dueDate?: string;
  status?: 'open' | 'in_progress' | 'done';
  priority?: 'none' | 'low' | 'med' | 'high' | 'urgent';
  focus?: boolean;
}

export interface NoteInput {
  title: string;
  body: string;
  pinned?: boolean;
}

export interface TaskPatch {
  title?: string;
  status?: 'open' | 'in_progress' | 'done';
  priority?: 'none' | 'low' | 'med' | 'high' | 'urgent';
  focus?: boolean;
  dueDate?: string | null;
  detail?: string | null;
}

export class AgentError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'AgentError';
    this.status = status;
  }
}

async function httpFetch(): Promise<typeof fetch> {
  if (isTauri()) {
    const m = await import('@tauri-apps/plugin-http');
    return m.fetch as unknown as typeof fetch;
  }
  return fetch;
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  timeoutMs?: number;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { baseUrl, token } = await loadSettings();
  if (!token) throw new AgentError('No agent token set. Open Settings and paste your AGENT_API_TOKEN.', 0);
  const url = `${baseUrl.replace(/\/+$/, '')}${path}`;
  const f = await httpFetch();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 8000);
  try {
    const res = await f(url, {
      method: opts.method ?? 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
      },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
      signal: controller.signal,
    });
    const text = await res.text();
    let json: unknown = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    if (!res.ok) {
      const msg =
        (json && typeof json === 'object' && 'error' in json && typeof json.error === 'string'
          ? json.error
          : null) ?? `Request failed (${res.status})`;
      throw new AgentError(msg, res.status);
    }
    if (json && typeof json === 'object' && 'data' in json) {
      return (json as { data: T }).data;
    }
    return json as T;
  } catch (e) {
    if (e instanceof AgentError) throw e;
    if (e instanceof DOMException && e.name === 'AbortError') {
      throw new AgentError('Timed out reaching the dashboard.', 0);
    }
    throw new AgentError(e instanceof Error ? e.message : 'Network error', 0);
  } finally {
    clearTimeout(timer);
  }
}

export const agent = {
  getContext: () => request<AgentContext>('/api/agent/context'),
  logMood: (input: MoodInput) =>
    request<unknown>('/api/agent/mood', { method: 'POST', body: { source: 'self', ...input } }),
  logSleep: (input: SleepInput) =>
    request<unknown>('/api/agent/sleep', { method: 'POST', body: { source: 'self', ...input } }),
  getSleepHistory: (limit = 14) => request<SleepSummary[]>(`/api/agent/sleep?limit=${limit}`),
  deleteSleep: (id: number) => request<unknown>(`/api/agent/sleep/${id}`, { method: 'DELETE' }),
  addTask: (input: TaskInput) => request<unknown>('/api/agent/tasks', { method: 'POST', body: input }),
  updateTask: (id: number, patch: TaskPatch) =>
    request<unknown>(`/api/agent/tasks/${id}`, { method: 'PATCH', body: patch }),
  deleteTask: (id: number) => request<unknown>(`/api/agent/tasks/${id}`, { method: 'DELETE' }),
  addNote: (input: NoteInput) => request<unknown>('/api/agent/note', { method: 'POST', body: input }),
  setNow: (statement: string) =>
    request<unknown>('/api/agent/now', { method: 'POST', body: { statement } }),
  addHighlight: (text: string, source?: string) =>
    request<unknown>('/api/agent/highlight', { method: 'POST', body: { text, source } }),
  checkInHabit: (input: HabitCheckinInput) =>
    request<unknown>('/api/agent/habit-checkin', { method: 'POST', body: input }),
};

export async function testConnection(): Promise<{ ok: boolean; message: string }> {
  try {
    const ctx = await agent.getContext();
    return { ok: true, message: `Connected — ${ctx.openTasks.length} open task(s), ${ctx.date}.` };
  } catch (e) {
    if (e instanceof AgentError) return { ok: false, message: e.message };
    return { ok: false, message: 'Could not connect.' };
  }
}
