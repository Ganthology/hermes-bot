import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import {
  skillInspectBody,
  skillInspectDescription,
  skillInspectTitle,
} from '../../../../src/agentInfo/primitives';
import { loadSkillDetail } from '../../../../src/agentInfo/load';
import { HostScopeBanner } from '../../../../src/components/HostScopeBanner';
import { ErrorBanner } from '../../../../src/components/ui';
import type { SkillInspectInfo } from '../../../../src/gateway/types';
import { useGateway } from '../../../../src/state/GatewayProvider';
import { getAgent } from '../../../../src/storage/agents';
import { colors, radii, spacing, typography } from '../../../../src/theme';

export default function SkillDetailScreen() {
  const params = useLocalSearchParams<{
    id: string;
    skill: string;
    category?: string;
  }>();
  const agentId = typeof params.id === 'string' ? params.id : '';
  const skillName = typeof params.skill === 'string' ? params.skill : '';
  const category =
    typeof params.category === 'string' && params.category.trim()
      ? params.category.trim()
      : null;

  const { ensureConnected } = useGateway();
  const [profileName, setProfileName] = useState<string | null>(null);
  const [info, setInfo] = useState<SkillInspectInfo | null>(null);
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
      const outcome = await loadSkillDetail(client, skillName, {
        profile: agent.profileName,
      });
      setInfo(outcome.info);
      setError(outcome.error);
    } catch (err) {
      setInfo(null);
      setError(err instanceof Error ? err.message : 'Could not inspect skill');
    } finally {
      setLoading(false);
    }
  }, [agentId, ensureConnected, skillName]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const title = skillInspectTitle(info, skillName);
  const description = skillInspectDescription(info);
  const body = skillInspectBody(info);
  const path = typeof info?.path === 'string' ? info.path : null;
  const source = typeof info?.source === 'string' ? info.source : null;

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: skillName || 'Skill', headerBackButtonDisplayMode: 'minimal' }} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Inspecting skill…</Text>
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          {error ? <ErrorBanner message={error} /> : null}
          <HostScopeBanner profileName={profileName} />

          <Text style={styles.title}>{title}</Text>
          {(category || (typeof info?.category === 'string' && info.category)) && (
            <Text style={styles.meta}>
              {typeof info?.category === 'string' && info.category.trim()
                ? info.category
                : category}
            </Text>
          )}
          {source ? <Text style={styles.meta}>Source · {source}</Text> : null}
          {path ? <Text style={styles.meta}>Path · {path}</Text> : null}

          {description ? (
            <Text style={styles.description}>{description}</Text>
          ) : (
            <Text style={styles.muted}>
              No description returned for this skill. List only exposes names by
              category; inspect may be hub-only on some hosts.
            </Text>
          )}

          {body ? (
            <View style={styles.bodyBox}>
              <Text style={styles.bodyLabel}>SKILL.md preview</Text>
              <Text style={styles.body}>{body}</Text>
            </View>
          ) : !error ? (
            <Text style={styles.muted}>
              No skill body preview from this host. Details are read-only when the
              gateway’s skills.manage inspect action can resolve them.
            </Text>
          ) : null}
        </ScrollView>
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
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  meta: {
    color: colors.textDim,
    ...typography.caption,
  },
  description: {
    color: colors.textMuted,
    ...typography.body,
    marginTop: spacing.sm,
  },
  muted: {
    color: colors.textDim,
    ...typography.caption,
    marginTop: spacing.sm,
  },
  bodyBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radii.md,
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  bodyLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  body: {
    color: colors.text,
    fontFamily: 'monospace',
    fontSize: 13,
    lineHeight: 18,
  },
});
