import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet } from 'react-native';

import { GatewayProvider } from '../src/state/GatewayProvider';
import { AgentsProvider } from '../src/state/AgentsProvider';
import { colors } from '../src/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={styles.root}>
      <GatewayProvider>
        <AgentsProvider>
          <StatusBar style="dark" />
          <Stack
            screenOptions={{
              headerStyle: { backgroundColor: colors.bgElevated },
              headerTintColor: colors.text,
              headerTitleStyle: { fontWeight: '600' },
              contentStyle: { backgroundColor: colors.bg },
              headerShadowVisible: false,
            }}
          >
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="connect" options={{ title: 'Connect' }} />
            <Stack.Screen name="agents/index" options={{ title: 'Hermes Bot' }} />
            <Stack.Screen name="agents/new" options={{ title: 'New agent' }} />
            <Stack.Screen name="agents/[id]" options={{ title: 'Chat' }} />
            <Stack.Screen name="settings" options={{ title: 'Settings' }} />
          </Stack>
        </AgentsProvider>
      </GatewayProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
