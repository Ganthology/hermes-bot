import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { DictationControls } from '../dictation/DictationControls';
import { useDictation } from '../dictation/useDictation';
import { colors, radii, spacing, typography } from '../theme';

export function Composer({
  onSend,
  disabled,
  sending,
}: {
  onSend: (text: string) => Promise<void> | void;
  disabled?: boolean;
  sending?: boolean;
}) {
  const [text, setText] = useState('');
  const [dictationSending, setDictationSending] = useState(false);

  const dictation = useDictation({
    disabled: Boolean(disabled) || Boolean(sending) || dictationSending,
    onTranscript: async (transcript) => {
      setDictationSending(true);
      try {
        await onSend(transcript);
      } finally {
        setDictationSending(false);
      }
    },
  });

  const submit = async () => {
    const next = text.trim();
    if (!next || disabled || sending || dictationSending) {
      return;
    }
    if (dictation.phase !== 'idle') {
      return;
    }
    setText('');
    await onSend(next);
  };

  const busyRecording = dictation.phase === 'recording' || dictation.phase === 'transcribing';
  const showSend = !busyRecording && !dictationSending;

  return (
    <View style={styles.root}>
      {dictation.error ? (
        <Pressable
          onPress={dictation.clearError}
          style={styles.errorBanner}
          accessibilityRole="button"
          accessibilityLabel="Dismiss dictation error"
        >
          <Text style={styles.errorText}>{dictation.error}</Text>
          <Text style={styles.dismiss}>Dismiss</Text>
        </Pressable>
      ) : null}

      <View style={styles.wrap}>
        {busyRecording || dictationSending ? (
          <View style={styles.dictationSlot}>
            <DictationControls
              dictation={dictation}
              sending={dictationSending || sending}
            />
          </View>
        ) : (
          <>
            <DictationControls dictation={dictation} sending={sending} />
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Message"
              placeholderTextColor={colors.textDim}
              style={styles.input}
              multiline
              editable={!disabled && !sending}
              onSubmitEditing={() => {
                void submit();
              }}
            />
            {showSend ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  void submit();
                }}
                disabled={disabled || sending || !text.trim()}
                style={({ pressed }) => [
                  styles.send,
                  (disabled || sending || !text.trim()) && styles.sendDisabled,
                  pressed && styles.pressed,
                ]}
              >
                {sending ? (
                  <ActivityIndicator color={colors.onAccent} />
                ) : (
                  <Text style={styles.sendLabel}>Send</Text>
                )}
              </Pressable>
            ) : null}
          </>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  errorBanner: {
    marginHorizontal: spacing.md,
    marginTop: spacing.sm,
    padding: spacing.sm,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.danger,
    backgroundColor: '#FDECEC',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  errorText: {
    flex: 1,
    color: colors.danger,
    ...typography.caption,
  },
  dismiss: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 12,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dictationSlot: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    color: colors.text,
    backgroundColor: colors.bgSoft,
  },
  send: {
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minWidth: 72,
    alignItems: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  sendLabel: {
    color: colors.onAccent,
    fontWeight: '700',
  },
});
