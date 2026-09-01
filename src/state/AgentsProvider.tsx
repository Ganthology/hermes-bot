import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  createAgent,
  deleteAgent,
  listAgents,
  touchAgent,
  updateAgentSessions,
  type AgentRecord,
} from '../storage/agents';

type AgentsContextValue = {
  agents: AgentRecord[];
  loading: boolean;
  refresh: () => Promise<void>;
  addAgent: (input: {
    name: string;
    description: string;
    storedSessionId?: string | null;
    liveSessionId?: string | null;
    profileName?: string | null;
  }) => Promise<AgentRecord>;
  patchSessions: (
    id: string,
    patch: {
      storedSessionId?: string | null;
      liveSessionId?: string | null;
      profileName?: string | null;
    },
  ) => Promise<void>;
  removeAgent: (id: string) => Promise<void>;
  bumpAgent: (id: string) => Promise<void>;
};

const AgentsContext = createContext<AgentsContextValue | null>(null);

export function AgentsProvider({ children }: { children: React.ReactNode }) {
  const [agents, setAgents] = useState<AgentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const rows = await listAgents();
    setAgents(rows);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await refresh();
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const addAgent = useCallback(
    async (input: {
      name: string;
      description: string;
      storedSessionId?: string | null;
      liveSessionId?: string | null;
      profileName?: string | null;
    }) => {
      const agent = await createAgent(input);
      await refresh();
      return agent;
    },
    [refresh],
  );

  const patchSessions = useCallback(
    async (
      id: string,
      patch: {
        storedSessionId?: string | null;
        liveSessionId?: string | null;
        profileName?: string | null;
      },
    ) => {
      await updateAgentSessions(id, patch);
      await refresh();
    },
    [refresh],
  );

  const removeAgent = useCallback(
    async (id: string) => {
      await deleteAgent(id);
      await refresh();
    },
    [refresh],
  );

  const bumpAgent = useCallback(
    async (id: string) => {
      await touchAgent(id);
      await refresh();
    },
    [refresh],
  );

  const value = useMemo(
    () => ({
      agents,
      loading,
      refresh,
      addAgent,
      patchSessions,
      removeAgent,
      bumpAgent,
    }),
    [agents, loading, refresh, addAgent, patchSessions, removeAgent, bumpAgent],
  );

  return <AgentsContext.Provider value={value}>{children}</AgentsContext.Provider>;
}

export function useAgents(): AgentsContextValue {
  const ctx = useContext(AgentsContext);
  if (!ctx) {
    throw new Error('useAgents must be used within AgentsProvider');
  }
  return ctx;
}
