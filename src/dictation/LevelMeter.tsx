import React from 'react';
import { StyleSheet, View } from 'react-native';

import { colors, radii, spacing } from '../theme';

const BAR_COUNT = 5;

/** Simple live level meter for the recording chrome. */
export function LevelMeter({ level }: { level: number }) {
  const clamped = Math.min(1, Math.max(0, level));

  return (
    <View style={styles.row} accessibilityLabel={`Mic level ${Math.round(clamped * 100)} percent`}>
      {Array.from({ length: BAR_COUNT }, (_, index) => {
        const threshold = (index + 1) / BAR_COUNT;
        const active = clamped >= threshold - 0.12;
        const height = 6 + index * 3;
        return (
          <View
            key={index}
            style={[
              styles.bar,
              { height },
              active ? styles.barActive : styles.barIdle,
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 20,
    paddingHorizontal: spacing.xs,
  },
  bar: {
    width: 3,
    borderRadius: radii.sm,
  },
  barActive: {
    backgroundColor: colors.accent,
  },
  barIdle: {
    backgroundColor: colors.border,
  },
});
