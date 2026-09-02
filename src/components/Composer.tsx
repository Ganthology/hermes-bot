import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardState } from 'react-native-keyboard-controller';

import { colors, radii, spacing } from '../theme';

const CONTROL_SIZE = 44;

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
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const canSend = Boolean(text.trim()) && !disabled && !sending;

  const submit = async () => {
    const next = text.trim();
    if (!next || disabled || sending) {
      return;
    }
    setText('');
    await onSend(next);
  };

  return (
    <View
      style={[
        styles.wrap,
        {
          paddingBottom: keyboardOpen ? spacing.sm : spacing.sm + insets.bottom,
        },
      ]}
    >
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
        accessibilityLabel="Send"
        onPress={() => {
          void submit();
        }}
        disabled={!canSend}
        style={({ pressed }) => [
          styles.send,
          !canSend && styles.sendDisabled,
          pressed && canSend && styles.pressed,
        ]}
      >
        {sending ? (
          <ActivityIndicator color={colors.onAccent} />
        ) : (
          <SymbolView
            name="arrow.up"
            size={18}
            weight="semibold"
            tintColor={colors.onAccent}
            fallback={<Text style={styles.sendGlyph}>↑</Text>}
          />
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
    paddingTop: spacing.sm,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
  },
  input: {
    flex: 1,
    minHeight: CONTROL_SIZE,
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
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    backgroundColor: colors.accent,
    borderRadius: radii.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: {
    opacity: 0.4,
  },
  pressed: {
    opacity: 0.85,
  },
  sendGlyph: {
    color: colors.onAccent,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
