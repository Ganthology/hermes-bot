import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { GatewayClosedError, HermesGatewayClient } from '../gateway/client';
import {
  clearCredentials,
  loadCredentials,
  saveCredentials,
  type ConnectionCredentials,
} from '../storage/credentials';
import type { ConnectionState } from '../gateway/types';

type GatewayContextValue = {
  ready: boolean;
  credentials: ConnectionCredentials | null;
  connectionState: ConnectionState;
  lastError: string | null;
  client: HermesGatewayClient | null;
  connect: (credentials: ConnectionCredentials) => Promise<void>;
  disconnect: () => Promise<void>;
  ensureConnected: () => Promise<HermesGatewayClient>;
  clearError: () => void;
};

const GatewayContext = createContext<GatewayContextValue | null>(null);

export function GatewayProvider({ children }: { children: React.ReactNode }) {
  const clientRef = useRef(new HermesGatewayClient());
  const [ready, setReady] = useState(false);
  const [credentials, setCredentials] = useState<ConnectionCredentials | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState>('idle');
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    const client = clientRef.current;
    const off = client.onState(setConnectionState);
    return () => {
      off();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stored = await loadCredentials();
        if (!cancelled) {
          setCredentials(stored);
        }
      } finally {
        if (!cancelled) {
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const connect = useCallback(async (next: ConnectionCredentials) => {
    setLastError(null);
    const client = clientRef.current;
    client.disconnect();
    try {
      await client.connect(next.baseUrl, next.token);
      await saveCredentials(next);
      setCredentials(next);
    } catch (error) {
      const message =
        error instanceof GatewayClosedError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'I could not connect';
      setLastError(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }, []);

  const disconnect = useCallback(async () => {
    clientRef.current.disconnect();
    await clearCredentials();
    setCredentials(null);
    setLastError(null);
  }, []);

  const ensureConnected = useCallback(async () => {
    const client = clientRef.current;
    if (client.connectionState === 'open') {
      return client;
    }
    const creds = credentials ?? (await loadCredentials());
    if (!creds) {
      throw new Error('Not connected — add your Hermes URL and token first');
    }
    try {
      await client.connect(creds.baseUrl, creds.token);
      setCredentials(creds);
      return client;
    } catch (error) {
      const message =
        error instanceof GatewayClosedError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'I could not connect';
      setLastError(message);
      throw error instanceof Error ? error : new Error(message);
    }
  }, [credentials]);

  const clearError = useCallback(() => setLastError(null), []);

  const value = useMemo<GatewayContextValue>(
    () => ({
      ready,
      credentials,
      connectionState,
      lastError,
      client: clientRef.current,
      connect,
      disconnect,
      ensureConnected,
      clearError,
    }),
    [
      ready,
      credentials,
      connectionState,
      lastError,
      connect,
      disconnect,
      ensureConnected,
      clearError,
    ],
  );

  return <GatewayContext.Provider value={value}>{children}</GatewayContext.Provider>;
}

export function useGateway(): GatewayContextValue {
  const ctx = useContext(GatewayContext);
  if (!ctx) {
    throw new Error('useGateway must be used within GatewayProvider');
  }
  return ctx;
}
