import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import {
  statusLabel,
  wiringLabel,
} from '../../src/connected/inferConnectedServices';
import { loadConnectedServices } from '../../src/connected/loadConnectedServices';
import type { ConnectedService, ConnectedServicesSnapshot } from '../../src/connected/types';
import { EmptyState, ErrorBanner } from '../../src/components/ui';
import { useGateway } from '../../src/state/GatewayProvider';
import { colors, radii, spacing, typography } from '../../src/theme';

function statusColor(status: ConnectedService['status']): string {
  switch (status) {
    case 'connected':
      return colors.success;
    case 'not_connected':
      return colors.textDim;
    case 'unknown':
      return colors.warning;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export default function ConnectedServicesScreen() {
  const { profile } = useLocalSearchParams<{ profile?: string }>();
  const profileName =
    typeof profile === 'string' && profile.trim() ? profile.trim() : null;
  const { ensureConnected } = useGateway();
  const [snapshot, setSnapshot] = useState<ConnectedServicesSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (mode: 'initial' | 'refresh') => {
      if (mode === 'initial') {
        setLoading(true);
      } else {
        setRefreshing(true);
      }
      setError(null);
      try {
        const client = await ensureConnected();
        const next = await loadConnectedServices(client, { profileName });
        setSnapshot(next);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load connected services');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [ensureConnected, profileName],
  );

  useEffect(() => {
    void load('initial');
  }, [load]);

  const listHeader = (
    <View style={styles.headerBlock}>
      {error ? <ErrorBanner message={error} /> : null}
      <Text style={styles.scope}>{snapshot?.scopeLabel ?? 'Host / profile'}</Text>
      <Text style={styles.hint}>
        Services shared by agents on this Hermes host. Configured on the machine — not in this
        app.
      </Text>
    </View>
  );

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: 'Connected' }} />
      {loading && !snapshot ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Checking host services…</Text>
        </View>
      ) : (
        <FlatList
          data={snapshot?.services ?? []}
          keyExtractor={(item) => item.id}
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.list}
          ListHeaderComponent={listHeader}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                void load('refresh');
              }}
              tintColor={colors.accent}
            />
          }
          ListEmptyComponent={
            <EmptyState
              title="No extra services on this host"
              body="MCP servers, skills, and CLIs are configured on the Hermes machine — not in this app. When GitHub skills or product MCP servers are present, they show up here."
            />
          }
          renderItem={({ item }) => (
            <ServiceRow
              service={item}
              onPress={() =>
                router.push({
                  pathname: '/connected/[id]',
                  params: {
                    id: item.id,
                    ...(profileName ? { profile: profileName } : {}),
                  },
                })
              }
            />
          )}
        />
      )}
    </View>
  );
}

function ServiceRow({
  service,
  onPress,
}: {
  service: ConnectedService;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
      onPress={onPress}
      accessibilityRole="button"
    >
      <View style={styles.rowTop}>
        <Text style={styles.name}>{service.name}</Text>
        <Text style={[styles.status, { color: statusColor(service.status) }]}>
          {statusLabel(service.status)}
        </Text>
      </View>
      <Text style={styles.enables} numberOfLines={2}>
        {service.enables}
      </Text>
      <Text style={styles.wiring}>{wiringLabel(service.wiring)}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
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
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  headerBlock: {
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  scope: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
  },
  hint: {
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
    gap: spacing.xs,
  },
  rowPressed: { opacity: 0.85 },
  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  name: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    flex: 1,
  },
  status: {
    fontSize: 13,
    fontWeight: '600',
  },
  enables: {
    color: colors.textMuted,
    ...typography.caption,
  },
  wiring: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
});
