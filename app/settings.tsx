import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Stack } from 'expo-router';

import { DICTATION_CATALOG, isDictationStubEnabled, resolveDictationProvider } from '../src/dictation';
import { colors, radii, spacing, typography } from '../src/theme';

export default function SettingsScreen() {
  const active = resolveDictationProvider();
  const stubOn = isDictationStubEnabled();

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.content}>
      <Stack.Screen options={{ title: 'Settings' }} />

      <Text style={styles.sectionTitle}>Dictation</Text>
      <Text style={styles.sectionBody}>
        Voice-to-text into chat. Record on the composer, stop to transcribe, then the text sends as a
        normal prompt. Engines below land in follow-up PRs.
      </Text>

      <View style={styles.card}>
        <Text style={styles.cardLabel}>Active now</Text>
        <Text style={styles.cardValue}>{active.label}</Text>
        <Text style={styles.cardHint}>
          {stubOn
            ? 'Demo stub is on so record → stop → send is reviewable without a real model. Set EXPO_PUBLIC_DICTATION_STUB=0 for the unavailable message.'
            : 'No engine yet — stop after recording shows a clear “pick an engine” error.'}
        </Text>
      </View>

      {DICTATION_CATALOG.map((entry) => (
        <Pressable
          key={entry.id}
          disabled
          accessibilityState={{ disabled: true }}
          style={[styles.row, styles.rowDisabled]}
        >
          <View style={styles.rowBody}>
            <Text style={styles.rowTitle}>{entry.label}</Text>
            <Text style={styles.rowBlurb}>{entry.blurb}</Text>
          </View>
          <Text style={styles.coming}>Coming in follow-up PRs</Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.title,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    color: colors.textMuted,
    ...typography.body,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  cardHint: {
    color: colors.textMuted,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  row: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowBody: {
    gap: 4,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowBlurb: {
    color: colors.textMuted,
    ...typography.caption,
  },
  coming: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
});
