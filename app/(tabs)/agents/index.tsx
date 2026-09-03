import React, { useCallback, useMemo, useState } from 'react';
import { FlatList, Pressable, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { useHostAgents, type RosterAgent } from '../../../src/state/HostAgentsProvider';
import { useGateway } from '../../../src/state/GatewayProvider';
import { ensureLocalPinForHostAgent } from '../../../src/profiles';
import { Button, EmptyState, ErrorBanner } from '../../../src/components/ui';
import { AgentFace } from '../../../src/components/chrome';
import { plexSans } from '../../../src/fonts';
import { colors, spacing } from '../../../src/theme';

export default function AgentsHomeScreen() {
  const { agents, loading, error, refresh } = useHostAgents();
  const { lastError, clearError } = useGateway();
  const [query, setQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return agents;
    }
    return agents.filter((agent) => {
      const hay = `${agent.name} ${agent.whatTheyDo} ${agent.subtitle}`.toLowerCase();
      return hay.includes(q);
    });
  }, [agents, query]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refresh();
    } finally {
      setRefreshing(false);
    }
  };

  const listHeader = (
    <>
      {lastError ? (
        <View style={styles.bannerWrap}>
          <ErrorBanner message={lastError} />
          <Pressable onPress={clearError}>
            <Text style={styles.dismiss}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}
      {error ? (
        <View style={styles.bannerWrap}>
          <ErrorBanner message={error} />
        </View>
      ) : null}
      <Pressable
        onPress={() => router.push('/connected')}
        style={styles.bannerWrap}
        accessibilityRole="button"
        accessibilityLabel="Connected services"
      >
        <Text style={styles.connected}>Connected services</Text>
      </Pressable>
    </>
  );

  return (
    <>
      <FlatList
        data={loading && agents.length === 0 ? [] : visible}
        keyExtractor={(item) => item.id}
        contentInsetAdjustmentBehavior="automatic"
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />
        }
        ListEmptyComponent={
          loading ? (
            <Text style={styles.loading}>Loading…</Text>
          ) : error ? (
            <EmptyState
              title="Couldn't load agents"
              body="Pull to try again, or check that this Hermes host has a dashboard you can reach."
              action={
                <Button
                  label="Try again"
                  onPress={() => {
                    void refresh();
                  }}
                />
              }
            />
          ) : (
            <EmptyState
              title="No agents yet"
              body="Add someone. Each agent is a forever chat on this host."
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

function AgentRow({ agent }: { agent: RosterAgent }) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={() => {
        void (async () => {
          await ensureLocalPinForHostAgent({
            hostId: agent.id,
            displayName: agent.name,
            description: agent.whatTheyDo,
          });
          router.push(`/agents/${encodeURIComponent(agent.id)}`);
        })();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Open chat with ${agent.name}`}
    >
      <AgentFace name={agent.name} />
      <View style={styles.rowBody}>
        <Text style={styles.name} numberOfLines={1}>
          {agent.name}
        </Text>
        <Text style={styles.preview} numberOfLines={1}>
          {agent.subtitle || agent.whatTheyDo || 'Named agent'}
        </Text>
      </View>
      <Pressable
        onPress={() => router.push(`/agents/${encodeURIComponent(agent.id)}/info`)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Info for ${agent.name}`}
      >
        <Text style={styles.edit}>Info</Text>
      </Pressable>
      <Pressable
        onPress={() => router.push(`/agents/${encodeURIComponent(agent.id)}/edit`)}
        hitSlop={10}
        accessibilityRole="button"
        accessibilityLabel={`Edit ${agent.name}`}
      >
        <Text style={styles.edit}>Edit</Text>
      </Pressable>
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
  connected: {
    ...plexSans.medium,
    color: colors.accent,
    fontSize: 15,
    paddingBottom: spacing.sm,
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
  edit: {
    ...plexSans.medium,
    color: colors.accent,
    fontSize: 15,
  },
});
