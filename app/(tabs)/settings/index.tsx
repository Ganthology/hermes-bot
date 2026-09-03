import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Stack } from 'expo-router/stack';

import { useGateway } from '../../../src/state/GatewayProvider';
import type { ConnectionState } from '../../../src/gateway/types';
import { plexSans } from '../../../src/fonts';
import { colors, typography } from '../../../src/theme';

function hostStatus(state: ConnectionState): string {
  switch (state) {
    case 'open':
      return 'Connected';
    case 'connecting':
      return 'Connecting…';
    case 'closed':
      return 'Disconnected';
    case 'error':
      return 'Connection error';
    case 'idle':
      return 'Idle — connects when you open a chat';
    default: {
      const _never: never = state;
      return _never;
    }
  }
}

export default function SettingsScreen() {
  const { credentials, disconnect, connectionState } = useGateway();

  return (
    <>
      <ScrollView
        style={styles.scroll}
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
      >
        <Text style={styles.sectionLabel}>Host</Text>
        <View style={styles.card}>
          <View style={styles.row}>
            <View style={styles.rowBody}>
              <Text style={styles.rowTitle}>Connected host</Text>
              <Text style={styles.rowBlurb} numberOfLines={2}>
                {credentials?.baseUrl ?? 'No host saved'}
              </Text>
              <Text style={styles.rowMeta}>{hostStatus(connectionState)}</Text>
            </View>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Disconnect from host"
            onPress={() => {
              void (async () => {
                await disconnect();
                router.replace('/connect');
              })();
            }}
            style={({ pressed }) => [styles.row, pressed && styles.rowPressed]}
          >
            <Text style={styles.danger}>Disconnect</Text>
          </Pressable>
        </View>
      </ScrollView>
      <Stack.Title large>Settings</Stack.Title>
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    paddingBottom: 24,
  },
  sectionLabel: {
    ...typography.mono,
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
    color: colors.textDim,
  },
  card: {
    overflow: 'hidden',
    marginHorizontal: 16,
    marginBottom: 14,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderCurve: 'continuous',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.border,
  },
  rowPressed: {
    backgroundColor: colors.bgSoft,
  },
  rowBody: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  rowTitle: {
    ...plexSans.medium,
    color: colors.text,
    fontSize: 16,
  },
  rowBlurb: {
    color: colors.textMuted,
    ...typography.caption,
  },
  rowMeta: {
    ...plexSans.regular,
    color: colors.textDim,
    fontSize: 13,
    marginTop: 2,
  },
  danger: {
    ...plexSans.medium,
    color: colors.danger,
    fontSize: 16,
  },
});
