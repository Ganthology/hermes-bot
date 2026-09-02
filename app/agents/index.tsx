import React, { useLayoutEffect } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { router, Stack, useNavigation } from 'expo-router';

import { useAgents } from '../../src/state/AgentsProvider';
import { useGateway } from '../../src/state/GatewayProvider';
import { Button, EmptyState, ErrorBanner } from '../../src/components/ui';
import type { AgentRecord } from '../../src/storage/agents';
import { colors, radii, spacing, typography } from '../../src/theme';

export default function AgentsHomeScreen() {
  const { agents, loading } = useAgents();
  const { disconnect, lastError, connectionState, clearError } = useGateway();
  const navigation = useNavigation();

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <Pressable onPress={() => router.push('/settings')} hitSlop={8}>
          <Text style={styles.headerAction}>Settings</Text>
        </Pressable>
      ),
      headerRight: () => (
        <Pressable
          onPress={() => {
            void (async () => {
              await disconnect();
              router.replace('/connect');
            })();
          }}
          hitSlop={8}
        >
          <Text style={styles.headerAction}>Disconnect</Text>
        </Pressable>
      ),
    });
  }, [navigation, disconnect]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Hermes Bot' }} />
      {lastError ? (
        <View style={styles.bannerWrap}>
          <ErrorBanner message={lastError} />
          <Pressable onPress={clearError}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.statusRow}>
        <Text style={styles.status}>
          {connectionState === 'open'
            ? 'Connected'
            : connectionState === 'connecting'
              ? 'Connecting…'
              : 'Idle — will connect when you open a chat'}
        </Text>
        <Button label="New agent" onPress={() => router.push('/agents/new')} style={styles.newBtn} />
      </View>

      {loading ? (
        <Text style={styles.loading}>Loading…</Text>
      ) : agents.length === 0 ? (
        <EmptyState
          title="No agents yet"
          body="Create a named agent. Each one is a forever chat with Hermes."
          action={<Button label="New agent" onPress={() => router.push('/agents/new')} />}
        />
      ) : (
        <FlatList
          data={agents}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => <AgentRow agent={item} />}
        />
      )}
    </View>
  );
}

function AgentRow({ agent }: { agent: AgentRecord }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/agents/${agent.id}`)}
    >
      <View style={styles.avatar}>
        <Text style={styles.avatarText}>{agent.name.slice(0, 1).toUpperCase()}</Text>
      </View>
      <View style={styles.rowBody}>
        <Text style={styles.name}>{agent.name}</Text>
        <Text style={styles.desc} numberOfLines={1}>
          {agent.description || 'Named agent'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  headerAction: {
    color: colors.accent,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
  },
  bannerWrap: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  dismiss: {
    color: colors.textMuted,
    textAlign: 'right',
    marginBottom: spacing.sm,
  },
  statusRow: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  status: {
    flex: 1,
    color: colors.textDim,
    ...typography.caption,
  },
  newBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  loading: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  list: {
    padding: spacing.md,
    gap: spacing.sm,
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
  rowPressed: {
    opacity: 0.85,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 18,
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  desc: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
