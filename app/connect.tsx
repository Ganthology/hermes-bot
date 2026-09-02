import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useGateway } from '../src/state/GatewayProvider';
import { Button, ErrorBanner, Field } from '../src/components/ui';
import { colors, radii, spacing, typography } from '../src/theme';

const DEFAULT_HINT = 'http://HOST:9119';

export default function ConnectScreen() {
  const { connect, lastError, clearError, connectionState } = useGateway();
  const [baseUrl, setBaseUrl] = useState('');
  const [token, setToken] = useState('');
  const [busy, setBusy] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const onConnect = async () => {
    clearError();
    setLocalError(null);
    const url = baseUrl.trim();
    const auth = token.trim();
    if (!url || !auth) {
      setLocalError('Paste both the Hermes base URL and auth token.');
      return;
    }
    setBusy(true);
    try {
      await connect({ baseUrl: url, token: auth });
      router.replace('/agents');
    } catch (error) {
      setLocalError(error instanceof Error ? error.message : 'I could not connect');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.brand}>Hermes Bot</Text>
        <Text style={styles.sub}>
          Point this phone at an existing Hermes host. Paste the base URL from{' '}
          <Text style={styles.mono}>hermes serve</Text> (default port 9119) and a dashboard
          session / auth token.
        </Text>

        {(localError || lastError) && <ErrorBanner message={localError ?? lastError ?? ''} />}

        <Field label="Hermes base URL" hint={`Example: ${DEFAULT_HINT} — not :8642`}>
          <TextInput
            value={baseUrl}
            onChangeText={setBaseUrl}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            placeholder={DEFAULT_HINT}
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
        </Field>

        <Field
          label="Auth token"
          hint="Dashboard session token or gateway auth ticket material. OAuth is not faked here."
        >
          <TextInput
            value={token}
            onChangeText={setToken}
            autoCapitalize="none"
            autoCorrect={false}
            secureTextEntry
            placeholder="Paste token"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
        </Field>

        <Button
          label={busy || connectionState === 'connecting' ? 'Connecting…' : 'Connect'}
          onPress={() => {
            void onConnect();
          }}
          disabled={busy}
        />

        <View style={styles.note}>
          <Text style={styles.noteText}>
            This app talks to the TUI gateway WebSocket at /api/ws on the dashboard port. The API
            server on :8642 is HTTP/SSE and does not serve /api/ws.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  brand: {
    color: colors.text,
    ...typography.brand,
    marginBottom: spacing.sm,
  },
  sub: {
    color: colors.textMuted,
    ...typography.body,
    marginBottom: spacing.lg,
  },
  mono: {
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
    color: colors.text,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    paddingVertical: 12,
    color: colors.text,
    backgroundColor: colors.bgSoft,
  },
  note: {
    marginTop: spacing.lg,
  },
  noteText: {
    color: colors.textDim,
    ...typography.caption,
  },
});
