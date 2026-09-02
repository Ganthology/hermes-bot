import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { HostScopeBanner } from '../../../src/components/HostScopeBanner';
import { EmptyState, ErrorBanner } from '../../../src/components/ui';
import { useGateway } from '../../../src/state/GatewayProvider';
import { getAgent, type AgentRecord } from '../../../src/storage/agents';
import { colors, radii, spacing, typography } from '../../../src/theme';
import { loadAgentMcp, loadAgentSkills } from '../../../src/agentInfo/load';

export default function AgentInfoScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agentId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const { ensureConnected, connectionState } = useGateway();

  const [agent, setAgent] = useState<AgentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [skillCount, setSkillCount] = useState<number | null>(null);
  const [mcpCount, setMcpCount] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const record = await getAgent(agentId);
      if (!record) {
        throw new Error('Agent not found');
      }
      setAgent(record);

      if (connectionState === 'closed' || connectionState === 'error') {
        // Still show sections; counts load when connected.
      }

      const client = await ensureConnected();
      const [skills, mcp] = await Promise.all([
        loadAgentSkills(client, { profile: record.profileName }),
        loadAgentMcp(client, {
          profile: record.profileName,
          sessionId: record.liveSessionId,
        }),
      ]);

      setSkillCount(skills.items.length);
      setMcpCount(mcp.servers.length);

      const parts: string[] = [];
      if (skills.error) {
        parts.push(skills.error);
      }
      if (mcp.error && mcp.servers.length === 0) {
        parts.push(mcp.error);
      }
      setError(parts.length ? parts.join('\n') : null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load agent info');
    } finally {
      setLoading(false);
    }
  }, [agentId, connectionState, ensureConnected]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <View style={styles.root}>
      <Stack.Screen
        options={{
          title: agent?.name ? `${agent.name}` : 'Agent info',
          headerBackButtonDisplayMode: 'minimal',
        }}
      />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        {loading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={colors.accent} />
            <Text style={styles.loadingText}>Loading…</Text>
          </View>
        ) : (
          <>
            {error ? <ErrorBanner message={error} /> : null}
            {agent ? (
              <View style={styles.identity}>
                <Text style={styles.name}>{agent.name}</Text>
                {agent.description ? (
                  <Text style={styles.desc}>{agent.description}</Text>
                ) : null}
              </View>
            ) : (
              <EmptyState title="Agent not found" body="Go back to the roster and try again." />
            )}

            <HostScopeBanner profileName={agent?.profileName} />

            <Text style={styles.sectionLabel}>Browse</Text>

            <InfoRow
              title="Skills"
              subtitle={
                skillCount === null
                  ? 'Installed skills on this host'
                  : skillCount === 0
                    ? 'No skills listed'
                    : `${skillCount} skill${skillCount === 1 ? '' : 's'}`
              }
              onPress={() => router.push(`/agents/${agentId}/skills`)}
            />
            <InfoRow
              title="MCP"
              subtitle={
                mcpCount === null
                  ? 'Configured servers and their tools'
                  : mcpCount === 0
                    ? 'No MCP servers listed'
                    : `${mcpCount} server${mcpCount === 1 ? '' : 's'}`
              }
              onPress={() => router.push(`/agents/${agentId}/mcp`)}
            />

            <View style={styles.placeholder}>
              <Text style={styles.placeholderTitle}>Connected services</Text>
              <Text style={styles.placeholderBody}>
                Product integrations (GitHub, Fly, Supabase, …) land in a parallel
                update — not in this browse surface yet.
              </Text>
            </View>
          </>
        )}
      </ScrollView>
    </View>
  );
}

function InfoRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
    >
      <View style={styles.rowBody}>
        <Text style={styles.rowTitle}>{title}</Text>
        <Text style={styles.rowSubtitle}>{subtitle}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
  },
  loading: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  identity: {
    marginBottom: spacing.md,
    gap: spacing.xs,
  },
  name: {
    color: colors.text,
    ...typography.title,
  },
  desc: {
    color: colors.textMuted,
    ...typography.body,
  },
  sectionLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
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
    marginBottom: spacing.sm,
  },
  rowPressed: { opacity: 0.85 },
  rowBody: { flex: 1, gap: 2 },
  rowTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  rowSubtitle: {
    color: colors.textMuted,
    ...typography.caption,
  },
  chevron: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '300',
  },
  placeholder: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: 'dashed',
    gap: spacing.xs,
  },
  placeholderTitle: {
    color: colors.textDim,
    fontSize: 14,
    fontWeight: '600',
  },
  placeholderBody: {
    color: colors.textDim,
    ...typography.caption,
  },
});
