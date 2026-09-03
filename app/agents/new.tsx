import React, { useMemo, useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { router } from 'expo-router';

import { useHostAgents } from '../../src/state/HostAgentsProvider';
import { Button, ErrorBanner, Field } from '../../src/components/ui';
import { ProfilesReadOnlyError } from '../../src/profiles';
import { colors, radii, spacing, typography } from '../../src/theme';

type StartMode = 'blank' | 'copy';

export default function NewAgentScreen() {
  const { agents, getService, refresh } = useHostAgents();
  const [name, setName] = useState('');
  const [whatTheyDo, setWhatTheyDo] = useState('');
  const [mode, setMode] = useState<StartMode>('blank');
  const [cloneFrom, setCloneFrom] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cloneOptions = useMemo(
    () => agents.filter((a) => a.id.trim().length > 0),
    [agents],
  );

  const onCreate = async () => {
    setError(null);
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Give this agent a name.');
      return;
    }
    if (mode === 'copy' && !cloneFrom) {
      setError('Pick an agent to copy from, or start blank.');
      return;
    }

    setBusy(true);
    try {
      const svc = await getService();
      if (!svc.capabilities.canCreate) {
        throw new ProfilesReadOnlyError(
          "This host doesn't allow creating agents yet. Update Hermes or use the desktop dashboard.",
        );
      }
      const created = await svc.create({
        name: trimmedName,
        whatTheyDo: whatTheyDo.trim(),
        cloneFrom: mode === 'copy' ? cloneFrom : null,
      });
      await refresh();
      router.replace(`/agents/${encodeURIComponent(created.id)}`);
    } catch (err) {
      if (err instanceof ProfilesReadOnlyError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not create agent');
      }
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
        <Text style={styles.lead}>
          Name them. Say what they do. Then you’ll set who they are.
        </Text>
        {error ? <ErrorBanner message={error} /> : null}

        <Field label="Name">
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Research buddy"
            placeholderTextColor={colors.textDim}
            style={styles.input}
            autoCapitalize="words"
          />
        </Field>

        <Field label="What they do">
          <TextInput
            value={whatTheyDo}
            onChangeText={setWhatTheyDo}
            placeholder="Helps me dig through papers"
            placeholderTextColor={colors.textDim}
            style={[styles.input, styles.multiline]}
            multiline
          />
        </Field>

        <Text style={styles.section}>Start from</Text>
        <View style={styles.choiceRow}>
          <Choice
            label="Start blank"
            selected={mode === 'blank'}
            onPress={() => {
              setMode('blank');
              setCloneFrom(null);
            }}
          />
          <Choice
            label="Copy from an existing agent"
            selected={mode === 'copy'}
            onPress={() => setMode('copy')}
          />
        </View>

        {mode === 'copy' ? (
          <View style={styles.cloneList}>
            {cloneOptions.length === 0 ? (
              <Text style={styles.cloneEmpty}>No agents to copy yet. Start blank instead.</Text>
            ) : (
              cloneOptions.map((agent) => (
                <Pressable
                  key={agent.id}
                  onPress={() => setCloneFrom(agent.id)}
                  style={[
                    styles.cloneRow,
                    cloneFrom === agent.id && styles.cloneRowSelected,
                  ]}
                >
                  <Text style={styles.cloneName}>{agent.name}</Text>
                  <Text style={styles.cloneDesc} numberOfLines={1}>
                    {agent.subtitle}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        ) : null}

        <Button
          label={busy ? 'Creating…' : 'Continue'}
          disabled={busy}
          onPress={() => {
            void onCreate();
          }}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Choice({
  label,
  selected,
  onPress,
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.choice, selected && styles.choiceSelected]}
    >
      <Text style={[styles.choiceLabel, selected && styles.choiceLabelSelected]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  content: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
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
    paddingVertical: 14,
    color: colors.text,
    backgroundColor: colors.bgElevated,
    fontSize: 17,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  section: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.sm,
    marginTop: spacing.sm,
  },
  choiceRow: {
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgElevated,
  },
  choiceSelected: {
    borderColor: colors.accent,
    backgroundColor: colors.userBubble,
  },
  choiceLabel: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  choiceLabelSelected: {
    color: colors.accent,
    fontWeight: '600',
  },
  cloneList: {
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  cloneEmpty: {
    color: colors.textDim,
    ...typography.caption,
  },
  cloneRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    backgroundColor: colors.bgElevated,
  },
  cloneRowSelected: {
    borderColor: colors.accent,
  },
  cloneName: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 16,
  },
  cloneDesc: {
    color: colors.textMuted,
    ...typography.caption,
    marginTop: 2,
  },
});
