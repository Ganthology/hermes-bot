import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
} from 'react-native';
import { router } from 'expo-router';

import { useAgents } from '../../src/state/AgentsProvider';
import { useGateway } from '../../src/state/GatewayProvider';
import { profilesList, sessionCreate } from '../../src/gateway/methods';
import { Button, ErrorBanner, Field } from '../../src/components/ui';
import { colors, radii, spacing, typography } from '../../src/theme';

export default function NewAgentScreen() {
  const { addAgent } = useAgents();
  const { ensureConnected } = useGateway();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onCreate = async () => {
    setError(null);
    const trimmedName = name.trim();
    const trimmedDescription = description.trim();
    if (!trimmedName) {
      setError('Give this agent a name.');
      return;
    }

    setBusy(true);
    try {
      const client = await ensureConnected();

      // Optional profile if the gateway returns one — never invent profile YAML.
      let profileName: string | undefined;
      const listed = await profilesList(client);
      if (
        listed &&
        typeof listed === 'object' &&
        Array.isArray((listed as { profiles?: unknown }).profiles)
      ) {
        const profiles = (listed as { profiles: { name?: string }[] }).profiles;
        const first = profiles.find((p) => typeof p.name === 'string' && p.name.trim());
        if (first?.name) {
          profileName = first.name.trim();
        }
      }

      const created = await sessionCreate(client, {
        title: trimmedName,
        ...(profileName ? { profile: profileName } : {}),
      });

      const stored =
        created.stored_session_id?.trim() ||
        created.session_id?.trim() ||
        null;

      if (!stored) {
        throw new Error('Gateway created a chat but returned no id to pin.');
      }

      const agent = await addAgent({
        name: trimmedName,
        description: trimmedDescription,
        storedSessionId: stored,
        liveSessionId: created.session_id ?? null,
        profileName: profileName ?? null,
      });

      // Thin v1: description is local context; optional first prompt seeds the forever chat.
      router.replace(`/agents/${agent.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create agent');
    } finally {
      setBusy(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.lead}>Name someone. Say what they are for. That is the forever chat.</Text>
        {error ? <ErrorBanner message={error} /> : null}

        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Research buddy"
            placeholderTextColor={colors.textDim}
            style={styles.input}
          />
        </Field>

        <Field label="What it is for" hint="One line. Kept on the phone; not YAML.">
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="Helps me dig through papers"
            placeholderTextColor={colors.textDim}
            style={[styles.input, styles.multiline]}
            multiline
          />
        </Field>

        <Button
          label={busy ? 'Creating…' : 'Create agent'}
          disabled={busy}
          onPress={() => {
            void onCreate();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
  },
  lead: {
    color: colors.textMuted,
    ...typography.body,
    marginBottom: spacing.lg,
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
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
