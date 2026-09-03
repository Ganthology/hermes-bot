import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SymbolView } from 'expo-symbols';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardState } from 'react-native-keyboard-controller';

import {
  displayLabelForAttachment,
  pickDocuments,
  pickFromCamera,
  pickFromLibrary,
  type StagedAttachment,
} from '../chat/attachments';
import { colors, radii, spacing, typography } from '../theme';

const CONTROL_SIZE = 44;

export function Composer({
  onSend,
  disabled,
  sending,
}: {
  onSend: (text: string, attachments: StagedAttachment[]) => Promise<void> | void;
  disabled?: boolean;
  sending?: boolean;
}) {
  const [text, setText] = useState('');
  const [attachments, setAttachments] = useState<StagedAttachment[]>([]);
  const [picking, setPicking] = useState(false);
  const insets = useSafeAreaInsets();
  const keyboardOpen = useKeyboardState((state) => state.isVisible);
  const canSend =
    (Boolean(text.trim()) || attachments.length > 0) && !disabled && !sending && !picking;

  const addAttachments = (next: StagedAttachment[]) => {
    if (next.length === 0) {
      return;
    }
    setAttachments((prev) => [...prev, ...next]);
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((item) => item.id !== id));
  };

  const runPicker = async (picker: () => Promise<StagedAttachment[]>) => {
    setPicking(true);
    try {
      const next = await picker();
      addAttachments(next);
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Could not open the picker';
      Alert.alert('Attachment', message);
    } finally {
      setPicking(false);
    }
  };

  const openAttachSheet = () => {
    if (disabled || sending || picking) {
      return;
    }
    Alert.alert('Attach', undefined, [
      {
        text: 'Camera',
        onPress: () => {
          void runPicker(pickFromCamera);
        },
      },
      {
        text: 'Photo library',
        onPress: () => {
          void runPicker(pickFromLibrary);
        },
      },
      {
        text: 'File',
        onPress: () => {
          void runPicker(pickDocuments);
        },
      },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  const submit = async () => {
    const next = text.trim();
    const staged = attachments;
    if ((!next && staged.length === 0) || disabled || sending || picking) {
      return;
    }
    const previousText = text;
    const previousAttachments = attachments;
    setText('');
    setAttachments([]);
    try {
      await onSend(next, staged);
    } catch {
      // Restore staging if the parent surfaces a send/attach failure.
      setText(previousText);
      setAttachments(previousAttachments);
    }
  };

  return (
    <View
      style={[
        styles.shell,
        {
          paddingBottom: keyboardOpen ? spacing.sm : spacing.sm + insets.bottom,
        },
      ]}
    >
      {attachments.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tray}
        >
          {attachments.map((item) => (
            <View key={item.id} style={styles.chip}>
              {item.kind === 'image' && item.previewUri ? (
                <Image source={{ uri: item.previewUri }} style={styles.thumb} />
              ) : (
                <View style={styles.fileChip}>
                  <Text style={styles.fileChipKind}>
                    {item.kind === 'pdf' ? 'PDF' : 'FILE'}
                  </Text>
                  <Text style={styles.fileChipName} numberOfLines={2}>
                    {displayLabelForAttachment(item)}
                  </Text>
                </View>
              )}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ${item.name}`}
                onPress={() => removeAttachment(item.id)}
                style={styles.remove}
                hitSlop={8}
              >
                <Text style={styles.removeGlyph}>×</Text>
              </Pressable>
            </View>
          ))}
        </ScrollView>
      ) : null}

      <View style={styles.wrap}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Attach"
          onPress={openAttachSheet}
          disabled={disabled || sending || picking}
          style={({ pressed }) => [
            styles.attach,
            (disabled || sending || picking) && styles.sendDisabled,
            pressed && !(disabled || sending || picking) && styles.pressed,
          ]}
        >
          {picking ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <SymbolView
              name="plus"
              size={20}
              weight="semibold"
              tintColor={colors.accent}
              fallback={<Text style={styles.attachGlyph}>+</Text>}
            />
          )}
        </Pressable>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={attachments.length ? 'Add a caption (optional)' : 'Message'}
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
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bgElevated,
    paddingTop: spacing.sm,
  },
  tray: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  chip: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
  },
  fileChip: {
    width: 120,
    minHeight: 64,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    justifyContent: 'center',
    gap: 2,
  },
  fileChipKind: {
    color: colors.accent,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  fileChipName: {
    color: colors.text,
    ...typography.caption,
  },
  remove: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeGlyph: {
    color: colors.onAccent,
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 18,
  },
  wrap: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  attach: {
    width: CONTROL_SIZE,
    height: CONTROL_SIZE,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.bgSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  attachGlyph: {
    color: colors.accent,
    fontSize: 22,
    fontWeight: '600',
    lineHeight: 24,
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
