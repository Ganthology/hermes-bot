import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { plexSans } from '../fonts';
import { colors } from '../theme';

const FACE_HUES = ['#0053FD', '#C47B3A', '#3CB889', '#C47B00'] as const;

export function hueForName(name: string): string {
  let sum = 0;
  for (let i = 0; i < name.length; i += 1) {
    sum += name.charCodeAt(i) * (i + 1);
  }
  return FACE_HUES[sum % FACE_HUES.length];
}

export function AgentFace({ name }: { name: string }) {
  const hue = hueForName(name);
  return (
    <View
      style={[
        styles.face,
        {
          backgroundColor: `${hue}33`,
          borderColor: `${hue}66`,
        },
      ]}
    >
      <Text style={[styles.faceLetter, { color: hue }]}>
        {name.slice(0, 1).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  face: {
    width: 36,
    height: 36,
    borderRadius: 14,
    borderCurve: 'continuous',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  faceLetter: {
    ...plexSans.bold,
    fontSize: 15,
  },
});
