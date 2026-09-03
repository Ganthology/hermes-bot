import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { useAgents } from '../../../src/state/AgentsProvider';
import { useGateway } from '../../../src/state/GatewayProvider';
import { Button, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { AgentFace } from '../../../src/components/chrome';
import type { AgentRecord } from '../../../src/storage/agents';
import { plexSans } from '../../../src/fonts';
import { colors, spacing } from '../../../src/theme';

export default function AgentsHomeScreen() {
  const { agents, loading } = useAgents();
  const { lastError, clearError } = useGateway();
  const [query, setQuery] = useState('');

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return agents;
    }
    return agents.filter((agent) => {
      const hay = `${agent.name} ${agent.description}`.toLowerCase();
      return hay.includes(q);
    });
  }, [agents, query]);

  const listHeader = lastError ? (
    <View style={styles.bannerWrap}>
      <ErrorBanner message={lastError} />
      <Pressable onPress={clearError}>
        <Text style={styles.dismiss}>Dismiss</Text>
      </Pressable>
    </View>
  ) : null;

  return (
    <>
      <FlatList
        data={loading ? [] : visible}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={listHeader}
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loading}>Loading…</Text>
          ) : (
            <EmptyState
              title="No agents yet"
              body="Create a named agent. Each one is a forever chat with Hermes."
              action={<Button label="New agent" onPress={() => router.push('/agents/new')} />}
            />
          )
        }
        renderItem={({ item }) => <AgentRow agent={item} />}
      />
      <Stack.Title large>Agents</Stack.Title>
      <Stack.SearchBar
        placeholder="Search"
        hideWhenScrolling={false}
        placement="stacked"
        onChangeText={(event) => setQuery(event.nativeEvent.text)}
        onCancelButtonPress={() => setQuery('')}
      />
      <Stack.Toolbar placement="right">
        <Stack.Toolbar.Button
          icon="plus"
          accessibilityLabel="New agent"
          onPress={() => router.push('/agents/new')}
        />
      </Stack.Toolbar>
    </>
  );
}

function AgentRow({ agent }: { agent: AgentRecord }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => router.push(`/agents/${agent.id}`)}
      accessibilityRole="button"
      accessibilityLabel={`Open chat with ${agent.name}`}
    >
      <AgentFace name={agent.name} />
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {agent.name}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {agent.description || 'Named agent'}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  bannerWrap: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  dismiss: {
    color: colors.textMuted,
    textAlign: 'right',
    marginTop: spacing.xs,
  },
  loading: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  rowPressed: {
    opacity: 0.85,
    backgroundColor: colors.bgSoft,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  name: {
    ...plexSans.medium,
    color: colors.text,
    fontSize: 17,
  },
  preview: {
    ...plexSans.regular,
    color: colors.textMuted,
    fontSize: 15,
    lineHeight: 20,
  },
});
