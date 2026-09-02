import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';
import { LevelMeter } from './LevelMeter';
import type { UseDictationResult } from './useDictation';

type Props = {
  dictation: UseDictationResult;
  /** Parent send-in-flight (after transcript handed off). */
  sending?: boolean;
};

/**
 * Composer mic chrome: tap to record, tap stop to transcribe+send, cancel discards.
 */
export function DictationControls({ dictation, sending }: Props) {
  const { phase, level, blockedReason, start, stop, cancel } = dictation;
  const micBlocked = Boolean(blockedReason) || sending;

  if (phase === 'transcribing' || (phase === 'idle' && sending)) {
    return (
      <View style={styles.statusRow}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.statusText}>{sending ? 'Sending…' : 'Transcribing…'}</Text>
      </View>
    );
  }

  if (phase === 'recording') {
    return (
      <View style={styles.recordingRow}>
        <View style={styles.recordingMeta}>
          <View style={styles.dot} />
          <Text style={styles.recordingLabel}>Recording</Text>
          <LevelMeter level={level} />
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Cancel dictation"
          onPress={() => {
            void cancel();
          }}
          style={({ pressed }) => [styles.ghostBtn, pressed && styles.pressed]}
        >
          <Text style={styles.ghostLabel}>Cancel</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Stop recording"
          onPress={() => {
            void stop();
          }}
          style={({ pressed }) => [styles.stopBtn, pressed && styles.pressed]}
        >
          <Text style={styles.stopLabel}>Stop</Text>
        </Pressable>
      </View>
    );
  }

  if (blockedReason) {
    return (
      <View style={styles.blockedWrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: true }}
          disabled
          style={[styles.micBtn, styles.micDisabled]}
        >
          <Text style={styles.micLabel}>Mic</Text>
        </Pressable>
        <Text style={styles.blockedReason} numberOfLines={2}>
          {blockedReason}
        </Text>
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Start dictation"
      disabled={micBlocked}
      onPress={() => {
        void start();
      }}
      style={({ pressed }) => [
        styles.micBtn,
        micBlocked && styles.micDisabled,
        pressed && styles.pressed,
      ]}
    >
      <Text style={styles.micLabel}>Mic</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  micBtn: {
    width: 44,
    height: 44,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  micDisabled: {
    opacity: 0.4,
  },
  micLabel: {
    color: colors.accent,
    fontWeight: '700',
    fontSize: 13,
  },
  blockedWrap: {
    maxWidth: 160,
    alignItems: 'center',
    gap: spacing.xs,
  },
  blockedReason: {
    color: colors.textDim,
    ...typography.caption,
    textAlign: 'center',
  },
  recordingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  recordingMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.danger,
  },
  recordingLabel: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 13,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
    paddingHorizontal: spacing.sm,
  },
  statusText: {
    color: colors.textMuted,
    ...typography.caption,
  },
  ghostBtn: {
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  ghostLabel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 13,
  },
  stopBtn: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  stopLabel: {
    color: colors.onAccent,
    fontWeight: '700',
    fontSize: 13,
  },
  pressed: {
    opacity: 0.85,
  },
});
