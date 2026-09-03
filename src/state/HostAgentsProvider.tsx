import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  openProfilesService,
  mapProfileToFields,
  rosterSubtitle,
  type HostAgentFields,
  type HostProfile,
  type ProfilesCapabilities,
  type ProfilesService,
} from '../profiles';
import { ProfilesUnavailableError } from '../profiles/types';
import { useGateway } from './GatewayProvider';

export type RosterAgent = {
  id: string;
  name: string;
  role: string;
  whatTheyDo: string;
  subtitle: string;
  isDefault: boolean;
  profile: HostProfile;
};

type HostAgentsContextValue = {
  agents: RosterAgent[];
  loading: boolean;
  error: string | null;
  capabilities: ProfilesCapabilities | null;
  service: ProfilesService | null;
  refresh: () => Promise<void>;
  loadEditor: (id: string) => Promise<HostAgentFields>;
  getService: () => Promise<ProfilesService>;
};

const HostAgentsContext = createContext<HostAgentsContextValue | null>(null);

function toRosterAgent(profile: HostProfile): RosterAgent {
  const fields = mapProfileToFields(profile);
  return {
    id: fields.id,
    name: fields.name,
    role: fields.role,
    whatTheyDo: fields.whatTheyDo,
    subtitle: rosterSubtitle(fields),
    isDefault: fields.isDefault,
    profile,
  };
}

export function HostAgentsProvider({ children }: { children: React.ReactNode }) {
  const { credentials, client, ensureConnected, ready } = useGateway();
  const [agents, setAgents] = useState<RosterAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [capabilities, setCapabilities] = useState<ProfilesCapabilities | null>(null);
  const [service, setService] = useState<ProfilesService | null>(null);

  const getService = useCallback(async () => {
    const next = await openProfilesService({
      credentials,
      gateway: client,
      ensureGateway: ensureConnected,
    });
    setService(next);
    setCapabilities(next.capabilities);
    return next;
  }, [credentials, client, ensureConnected]);

  const refresh = useCallback(async () => {
    setError(null);
    try {
      const svc = await getService();
      if (!svc.capabilities.canList) {
        setAgents([]);
        setError(
          "Couldn't load agents from this host. Make sure you're connected to a dashboard-capable Hermes, then try again.",
        );
        return;
      }
      const rows = await svc.list();
      setAgents(rows.map(toRosterAgent));
    } catch (err) {
      setAgents([]);
      if (err instanceof ProfilesUnavailableError) {
        setError(err.message);
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Couldn't load agents from this host. Check the connection, then try again.",
        );
      }
    }
  }, [getService]);

  useEffect(() => {
    if (!ready) {
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        if (!credentials) {
          setAgents([]);
          setError(null);
          return;
        }
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
  }, [ready, credentials, refresh]);

  const loadEditor = useCallback(
    async (id: string) => {
      const svc = service ?? (await getService());
      return svc.loadEditor(id);
    },
    [service, getService],
  );

  const value = useMemo(
    () => ({
      agents,
      loading,
      error,
      capabilities,
      service,
      refresh,
      loadEditor,
      getService,
    }),
    [agents, loading, error, capabilities, service, refresh, loadEditor, getService],
  );

  return <HostAgentsContext.Provider value={value}>{children}</HostAgentsContext.Provider>;
}

export function useHostAgents(): HostAgentsContextValue {
  const ctx = useContext(HostAgentsContext);
  if (!ctx) {
    throw new Error('useHostAgents must be used within HostAgentsProvider');
  }
  return ctx;
}
