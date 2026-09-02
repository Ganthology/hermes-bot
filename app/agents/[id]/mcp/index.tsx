import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import type { McpServerListItem } from '../../../../src/agentInfo/primitives';
import { filterMcpServers, mcpStatusLabel } from '../../../../src/agentInfo/primitives';
import { loadAgentMcp } from '../../../../src/agentInfo/load';
import { HostScopeBanner } from '../../../../src/components/HostScopeBanner';
import { SearchField } from '../../../../src/components/SearchField';
import { EmptyState, ErrorBanner } from '../../../../src/components/ui';
import { useGateway } from '../../../../src/state/GatewayProvider';
import { getAgent } from '../../../../src/storage/agents';
import { colors, radii, spacing, typography } from '../../../../src/theme';

export default function AgentMcpScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agentId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const { ensureConnected } = useGateway();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [servers, setServers] = useState<McpServerListItem[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [partial, setPartial] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPartial(false);
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
      setServers(outcome.servers);
      setPartial(outcome.partial);
      setError(outcome.error);
    } catch (err) {
      setServers([]);
      setError(err instanceof Error ? err.message : 'Could not load MCP');
    } finally {
      setLoading(false);
    }
  }, [agentId, ensureConnected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => filterMcpServers(servers, query), [servers, query]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'MCP', headerBackButtonDisplayMode: 'minimal' }} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Loading MCP…</Text>
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
              {partial ? (
                <Text style={styles.hint}>
                  Server list was incomplete; showing what tools.show reported.
                </Text>
              ) : null}
              <HostScopeBanner profileName={profileName} />
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Search servers"
              />
              <Text style={styles.count}>
                {filtered.length === servers.length
                  ? `${servers.length} server${servers.length === 1 ? '' : 's'}`
                  : `${filtered.length} of ${servers.length}`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title={error ? 'MCP unavailable' : query ? 'No matches' : 'No MCP servers'}
              body={
                error
                  ? 'Reconnect to the dashboard (:9119), confirm MCP is configured on the host, then retry.'
                  : query
                    ? 'Try a different search.'
                    : 'This host has no configured MCP servers to browse.'
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() =>
                router.push({
                  pathname: '/agents/[id]/mcp/[server]',
                  params: { id: agentId, server: item.name },
                })
              }
            >
              <View style={styles.rowBody}>
                <Text style={styles.name}>{item.name}</Text>
                <Text style={styles.meta} numberOfLines={2}>
                  {item.transport}
                  {' · '}
                  {mcpStatusLabel(item)}
                  {item.toolCount !== null
                    ? ` · ${item.toolCount} tool${item.toolCount === 1 ? '' : 's'}`
                    : ''}
                </Text>
              </View>
              <Text style={styles.chevron}>›</Text>
            </Pressable>
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
  hint: {
    color: colors.warning,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  count: {
    color: colors.textDim,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radii.lg,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowPressed: { opacity: 0.85 },
  rowBody: { flex: 1, gap: 2 },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    ...typography.caption,
  },
  chevron: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '300',
  },
});
