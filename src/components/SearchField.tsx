import React from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <View style={styles.wrap}>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textDim}
        autoCapitalize="none"
        autoCorrect={false}
        clearButtonMode="while-editing"
        style={styles.input}
        accessibilityLabel={placeholder}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: spacing.sm,
  },
  input: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    ...typography.body,
  },
});
