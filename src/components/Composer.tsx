import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { colors, radii, spacing } from '../theme';

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

  const submit = async () => {
    const next = text.trim();
    if (!next || disabled || sending) {
      return;
    }
    setText('');
    await onSend(next);
  };

  return (
    <View style={styles.wrap}>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Message"
        placeholderTextColor={colors.textDim}
        style={styles.input}
        multiline
        editable={!disabled}
        onSubmitEditing={() => {
          void submit();
        }}
      />
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
          <ActivityIndicator color={colors.text} />
        ) : (
          <Text style={styles.sendLabel}>Send</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
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
    color: colors.text,
    fontWeight: '700',
  },
});
