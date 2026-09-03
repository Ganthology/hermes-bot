import React from 'react';
import { Stack } from 'expo-router/stack';

import { colors } from '../../../src/theme';

export default function AgentsStackLayout() {
  return (
    <Stack
      screenOptions={{
        headerTransparent: true,
        headerShadowVisible: false,
        headerLargeTitleShadowVisible: false,
        headerLargeStyle: { backgroundColor: 'transparent' },
        headerTitleStyle: { color: colors.text },
        headerTintColor: colors.text,
        headerBlurEffect: 'none',
        headerBackButtonDisplayMode: 'minimal',
        contentStyle: { backgroundColor: colors.bg },
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Agents', headerLargeTitleEnabled: true }}
      />
    </Stack>
  );
}
