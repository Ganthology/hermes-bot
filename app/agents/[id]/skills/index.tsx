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

import type { SkillListItem } from '../../../../src/agentInfo/primitives';
import { filterSkills } from '../../../../src/agentInfo/primitives';
import { loadAgentSkills } from '../../../../src/agentInfo/load';
import { HostScopeBanner } from '../../../../src/components/HostScopeBanner';
import { SearchField } from '../../../../src/components/SearchField';
import { EmptyState, ErrorBanner } from '../../../../src/components/ui';
import { useGateway } from '../../../../src/state/GatewayProvider';
import { getAgent } from '../../../../src/storage/agents';
import { colors, radii, spacing, typography } from '../../../../src/theme';

export default function AgentSkillsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agentId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const { ensureConnected } = useGateway();

  const [profileName, setProfileName] = useState<string | null>(null);
  const [items, setItems] = useState<SkillListItem[]>([]);
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
      const outcome = await loadAgentSkills(client, { profile: agent.profileName });
      setItems(outcome.items);
      setError(outcome.error);
    } catch (err) {
      setItems([]);
      setError(err instanceof Error ? err.message : 'Could not load skills');
    } finally {
      setLoading(false);
    }
  }, [agentId, ensureConnected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const filtered = useMemo(() => filterSkills(items, query), [items, query]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Skills', headerBackButtonDisplayMode: 'minimal' }} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Loading skills…</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.category}:${item.name}`}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ListHeaderComponent={
            <View>
              {error ? <ErrorBanner message={error} /> : null}
              <HostScopeBanner profileName={profileName} />
              <SearchField
                value={query}
                onChangeText={setQuery}
                placeholder="Search skills"
              />
              <Text style={styles.count}>
                {filtered.length === items.length
                  ? `${items.length} skill${items.length === 1 ? '' : 's'}`
                  : `${filtered.length} of ${items.length}`}
              </Text>
            </View>
          }
          ListEmptyComponent={
            <EmptyState
              title={error ? 'Skills unavailable' : query ? 'No matches' : 'No skills'}
              body={
                error
                  ? 'Reconnect or update the Hermes host, then try again.'
                  : query
                    ? 'Try a different search.'
                    : 'This host has no listable skills yet.'
              }
            />
          }
          renderItem={({ item }) => (
            <Pressable
              style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
              onPress={() =>
                router.push({
                  pathname: '/agents/[id]/skills/[skill]',
                  params: {
                    id: agentId,
                    skill: item.name,
                    category: item.category,
                  },
                })
              }
            >
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta} numberOfLines={2}>
                {item.category}
                {' · '}
                tap for description
              </Text>
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
    gap: 2,
  },
  rowPressed: { opacity: 0.85 },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  meta: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
