import React, { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';

import { Button, ErrorBanner, Field } from '../../../src/components/ui';
import type { HostAgentFields } from '../../../src/profiles';
import { ProfilesReadOnlyError } from '../../../src/profiles';
import { useHostAgents } from '../../../src/state/HostAgentsProvider';
import { colors, radii, spacing, typography } from '../../../src/theme';

const WHO_PLACEHOLDER = 'How they talk, what they care about, what they won’t do.';

export default function EditAgentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const hostId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const { loadEditor, getService, refresh, capabilities } = useHostAgents();

  const [draft, setDraft] = useState<HostAgentFields | null>(null);
  const [baseline, setBaseline] = useState<HostAgentFields | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const hydrate = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const fields = await loadEditor(hostId);
      setDraft(fields);
      setBaseline(fields);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Couldn't load this agent. Check the connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }, [hostId, loadEditor]);

  useEffect(() => {
    void hydrate();
  }, [hydrate]);

  const onDiscard = () => {
    if (baseline) {
      setDraft(baseline);
    }
    router.back();
  };

  const onSave = async () => {
    if (!draft || !baseline) {
      return;
    }
    const name = draft.name.trim();
    if (!name) {
      setError('Give this agent a name.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const svc = await getService();
      const saved = await svc.save({
        id: draft.id,
        name,
        role: draft.role.trim(),
        whatTheyDo: draft.whatTheyDo.trim(),
        whoTheyAre: draft.whoTheyAre,
        isDefault: draft.isDefault,
        previous: baseline,
      });
      setDraft(saved);
      setBaseline(saved);
      await refresh();
      router.back();
    } catch (err) {
      if (err instanceof ProfilesReadOnlyError) {
        setError(err.message);
      } else {
        setError(err instanceof Error ? err.message : 'Could not save changes.');
      }
    } finally {
      setBusy(false);
    }
  };

  const onDelete = () => {
    if (!draft || draft.isDefault) {
      return;
    }
    Alert.alert(
      'Remove agent?',
      'Remove this agent and their memory on the host?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              setBusy(true);
              setError(null);
              try {
                const svc = await getService();
                await svc.remove(draft.id);
                await refresh();
                router.replace('/agents');
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : 'Could not remove this agent.',
                );
              } finally {
                setBusy(false);
              }
            })();
          },
        },
      ],
    );
  };

  const canDelete = Boolean(capabilities?.canDelete) && draft != null && !draft.isDefault;

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <Stack.Screen options={{ title: 'Edit agent' }} />
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        {error ? <ErrorBanner message={error} /> : null}

        {loading || !draft ? (
          <Text style={styles.loading}>Loading…</Text>
        ) : (
          <>
            <Text style={styles.lead}>Who they are on this host. Save keeps it there.</Text>

            <Field label="Name">
              <TextInput
                value={draft.name}
                onChangeText={(name) => setDraft({ ...draft, name })}
                placeholder="Alex"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                autoCapitalize="words"
              />
            </Field>

            <Field label="Role" hint="One-line title, like Hiring specialist.">
              <TextInput
                value={draft.role}
                onChangeText={(role) => setDraft({ ...draft, role })}
                placeholder="Hiring specialist"
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />
            </Field>

            <Field label="What they do">
              <TextInput
                value={draft.whatTheyDo}
                onChangeText={(whatTheyDo) => setDraft({ ...draft, whatTheyDo })}
                placeholder="Screens candidates and drafts outreach"
                placeholderTextColor={colors.textDim}
                style={[styles.input, styles.multiline]}
                multiline
              />
            </Field>

            <Field
              label="Who they are"
              hint="Personality and standing instructions."
            >
              <TextInput
                value={draft.whoTheyAre}
                onChangeText={(whoTheyAre) => setDraft({ ...draft, whoTheyAre })}
                placeholder={WHO_PLACEHOLDER}
                placeholderTextColor={colors.textDim}
                style={[styles.input, styles.soul]}
                multiline
                textAlignVertical="top"
              />
            </Field>

            <View style={styles.actions}>
              <Button
                label={busy ? 'Saving…' : 'Save'}
                disabled={busy}
                onPress={() => {
                  void onSave();
                }}
              />
              <Button label="Discard" variant="ghost" disabled={busy} onPress={onDiscard} />
            </View>

            <Pressable
              onPress={() => setAdvancedOpen((v) => !v)}
              style={styles.advancedToggle}
            >
              <Text style={styles.advancedLabel}>
                {advancedOpen ? 'Hide advanced' : 'Advanced'}
              </Text>
            </Pressable>
            {advancedOpen ? (
              <Text style={styles.advancedBody}>Host id: {draft.id}</Text>
            ) : null}

            <View style={styles.deleteWrap}>
              <Button
                label="Remove agent"
                variant="danger"
                disabled={busy || !canDelete}
                onPress={onDelete}
              />
              {draft.isDefault ? (
                <Text style={styles.deleteHint}>The default agent can’t be removed.</Text>
              ) : !capabilities?.canDelete ? (
                <Text style={styles.deleteHint}>
                  This host doesn’t allow removing agents from the phone yet.
                </Text>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
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
  loading: {
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.xl,
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
  soul: {
    minHeight: 160,
    textAlignVertical: 'top',
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  advancedToggle: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  advancedLabel: {
    color: colors.accent,
    fontWeight: '600',
    fontSize: 15,
  },
  advancedBody: {
    color: colors.textDim,
    ...typography.caption,
    marginBottom: spacing.md,
  },
  deleteWrap: {
    marginTop: spacing.xl,
    gap: spacing.sm,
  },
  deleteHint: {
    color: colors.textDim,
    ...typography.caption,
  },
});
