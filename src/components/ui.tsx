import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { colors, radii, spacing, typography } from '../theme';

type ButtonProps = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  style,
}: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === 'primary' && styles.primary,
        variant === 'ghost' && styles.ghost,
        variant === 'danger' && styles.danger,
        (pressed || disabled) && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <Text
        style={[
          styles.label,
          variant === 'primary' && styles.primaryLabel,
          variant === 'ghost' && styles.ghostLabel,
          variant === 'danger' && styles.dangerLabel,
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

type FieldProps = {
  label: string;
  children: React.ReactNode;
  hint?: string;
};

export function Field({ label, children, hint }: FieldProps) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{label}</Text>
      {children}
      {hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

export function ErrorBanner({ message }: { message: string }) {
  return (
    <View style={styles.errorBanner}>
      <Text style={styles.errorText}>{message}</Text>
    </View>
  );
}

export function EmptyState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <View style={styles.empty}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  primary: {
    backgroundColor: colors.accent,
  },
  ghost: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.border,
  },
  danger: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: colors.danger,
  },
  pressed: {
    opacity: 0.85,
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  primaryLabel: {
    color: colors.onAccent,
  },
  ghostLabel: {
    color: colors.text,
  },
  dangerLabel: {
    color: colors.danger,
  },
  field: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  fieldLabel: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  hint: {
    color: colors.textDim,
    ...typography.caption,
  },
  errorBanner: {
    backgroundColor: '#FDECEC',
    borderColor: colors.danger,
    borderWidth: 1,
    borderRadius: radii.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  errorText: {
    color: colors.danger,
    ...typography.body,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
  },
  emptyTitle: {
    color: colors.text,
    ...typography.title,
    textAlign: 'center',
  },
  emptyBody: {
    color: colors.textMuted,
    ...typography.body,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
});
