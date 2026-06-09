import { useCallback, useEffect, useState } from 'react';
import { agent, type AgentContext } from '@/lib/agent';

export function useAgentContext(pollMs?: number) {
  const [data, setData] = useState<AgentContext | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const ctx = await agent.getContext();
      setData(ctx);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (!pollMs) return;
    const id = setInterval(() => void refresh(), pollMs);
    return () => clearInterval(id);
  }, [refresh, pollMs]);

  return { data, error, loading, refresh };
}
