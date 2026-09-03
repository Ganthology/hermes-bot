import React from 'react';
import { DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { KeyboardProvider } from 'react-native-keyboard-controller';
import { StyleSheet } from 'react-native';

import { fontSources } from '../src/fonts';
import { GatewayProvider } from '../src/state/GatewayProvider';
import { AgentsProvider } from '../src/state/AgentsProvider';
import { HostAgentsProvider } from '../src/state/HostAgentsProvider';
import { colors } from '../src/theme';

const appTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: colors.accent,
    background: colors.bg,
    card: colors.bg,
    text: colors.text,
    border: colors.border,
  },
};

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts(fontSources);

  if (!fontsLoaded && !fontError) {
    return <GestureHandlerRootView style={styles.root} />;
  }

  return (
    <GestureHandlerRootView style={styles.root}>
      <KeyboardProvider>
        <ThemeProvider value={appTheme}>
          <GatewayProvider>
            <AgentsProvider>
              <HostAgentsProvider>
                <StatusBar style="dark" />
                <Stack
                  screenOptions={{
                    headerTransparent: true,
                    headerBlurEffect: 'none',
                    headerShadowVisible: false,
                    headerTintColor: colors.text,
                    headerTitleStyle: { color: colors.text },
                    headerBackButtonDisplayMode: 'minimal',
                    contentStyle: { backgroundColor: colors.bg },
                  }}
                >
                  <Stack.Screen name="index" options={{ headerShown: false }} />
                  <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
                  <Stack.Screen name="connect" options={{ title: 'Connect' }} />
                  <Stack.Screen name="agents/new" options={{ title: 'New agent' }} />
                  <Stack.Screen name="agents/[id]/index" options={{ title: 'Chat' }} />
                  <Stack.Screen name="agents/[id]/edit" options={{ title: 'Edit agent' }} />
                </Stack>
              </HostAgentsProvider>
            </AgentsProvider>
          </GatewayProvider>
        </ThemeProvider>
      </KeyboardProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
});
