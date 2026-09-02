import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import type { McpToolListItem } from '../../../../src/agentInfo/primitives';
import { filterMcpTools } from '../../../../src/agentInfo/primitives';
import { loadAgentMcp, toolsForServerFromCache } from '../../../../src/agentInfo/load';
import { HostScopeBanner } from '../../../../src/components/HostScopeBanner';
import { SearchField } from '../../../../src/components/SearchField';
import { EmptyState, ErrorBanner } from '../../../../src/components/ui';
import { useGateway } from '../../../../src/state/GatewayProvider';
import { getAgent } from '../../../../src/storage/agents';
import { colors, radii, spacing, typography } from '../../../../src/theme';

export default function McpServerToolsScreen() {
  const params = useLocalSearchParams<{ id: string; server: string }>();
  const agentId = typeof params.id === 'string' ? params.id : '';
  const serverName = typeof params.server === 'string' ? params.server : '';

  const { ensureConnected } = useGateway();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [tools, setTools] = useState<McpToolListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const agent = await getAgent(agentId);
      if (!agent) {
        throw new Error('Agent not found');
      }
      setProfileName(agent.profileName);
      const client = await ensureConnected();
      const outcome = await loadAgentMcp(client, {
        profile: agent.profileName,
        sessionId: agent.liveSessionId,
      });
      if (!outcome.toolsShow) {
        setTools([]);
        setError(
          outcome.error ??
            'tools.show did not return tool sections. MCP tool names cannot be listed.',
        );
        return;
      }
      setTools(toolsForServerFromCache(outcome.toolsShow, serverName));
      setError(outcome.error);
    } catch (err) {
      setTools([]);
      setError(err instanceof Error ? err.message : 'Could not load MCP tools');
    } finally {
      setLoading(false);
    }
  }, [agentId, ensureConnected, serverName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => filterMcpTools(tools, query), [tools, query]);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: serverName || 'MCP tools',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Loading tools…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.name}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {error ? <ErrorBanner message={error} /> : null}
              <HostScopeBanner profileName={profileName} />
              <Text style={styles.groupLabel}>Tools · {serverName}</Text>
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Search tools"
              />
              <Text style={styles.count}>
                {filtered.length === tools.length
                  ? `${tools.length} tool${tools.length === 1 ? '' : 's'}`
                  : `${filtered.length} of ${tools.length}`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title={
                error
                  ? 'Tools unavailable'
                  : query
                    ? 'No matches'
                    : 'No tools for this server'
              }
              body={
                error
                  ? 'Confirm the MCP server is connected on the Hermes host, then reopen this screen.'
                  : query
                    ? 'Try a different search — large MCP catalogs (e.g. Cloudflare) need a filter.'
                    : 'The server may be disconnected, disabled, or still discovering tools.'
              }
            />
          }
          renderItem={({ item }) => (
            <View style={styles.row}>
              <Text style={styles.name}>{item.shortName}</Text>
              {item.description ? (
                <Text style={styles.desc} numberOfLines={3}>
                  {item.description}
                </Text>
              ) : (
                <Text style={styles.meta}>{item.name}</Text>
              )}
            </View>
          )}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  list: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
    flexGrow: 1,
  },
  groupLabel: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  count: {
    color: colors.textDim,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  row: {
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '600',
  },
  desc: {
    color: colors.textMuted,
    ...typography.caption,
  },
  meta: {
    color: colors.textDim,
    ...typography.caption,
  },
});
