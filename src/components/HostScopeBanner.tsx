import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

/**
 * Honest host/profile scope for v1 agent primitives.
 * Skills and MCP are shared on the connected Hermes host until a real profile bot.
 */
export function HostScopeBanner({
  profileName,
}: {
  profileName?: string | null;
}) {
  const scope = profileName?.trim()
    ? `from this host · profile ${profileName.trim()}`
    : 'from this host';

  return (
    <View style={styles.banner} accessibilityRole="text">
      <Text style={styles.title}>Shared with agents on this connection</Text>
      <Text style={styles.body}>
        Skills and MCP are {scope}. Per-agent isolation arrives when an agent is a
        real Hermes profile (Desktop Bot Mode).
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: colors.bgSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  title: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
