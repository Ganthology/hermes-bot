import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Stack } from 'expo-router';

import {
  CLOUD_ENGINES,
  DICTATION_CATALOG,
  cloudEngineMeta,
  hydrateDictationPreference,
  isDictationStubEnabled,
  resetDictationProviderCache,
  resolveDictationProvider,
  type CloudSttEngine,
} from '../src/dictation';
import { Button, ErrorBanner, Field } from '../src/components/ui';
import {
  clearCloudSttConfig,
  loadCloudSttDraft,
  loadDictationProviderPreference,
  saveCloudSttConfig,
  saveDictationProviderPreference,
} from '../src/storage/dictationCloud';
import { colors, radii, spacing, typography } from '../src/theme';

export default function SettingsScreen() {
  const stubOn = isDictationStubEnabled();

  const [loading, setLoading] = useState(true);
  const [preference, setPreference] = useState<'cloud' | null>(null);
  const [activeLabel, setActiveLabel] = useState(() => resolveDictationProvider().label);

  const [engine, setEngine] = useState<CloudSttEngine>('groq');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [hasStoredKey, setHasStoredKey] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedHint, setSavedHint] = useState<string | null>(null);

  const refreshActive = useCallback(async () => {
    await hydrateDictationPreference();
    resetDictationProviderCache();
    setActiveLabel(resolveDictationProvider().label);
    setPreference(await loadDictationProviderPreference());
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [draft, pref] = await Promise.all([
          loadCloudSttDraft(),
          loadDictationProviderPreference(),
        ]);
        if (cancelled) {
          return;
        }
        setEngine(draft.engine);
        setApiKey(draft.apiKey);
        setModel(draft.model);
        setBaseUrl(draft.baseUrl);
        setHasStoredKey(draft.hasKey);
        setPreference(pref);
        await hydrateDictationPreference();
        resetDictationProviderCache();
        setActiveLabel(resolveDictationProvider().label);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const engineMeta = cloudEngineMeta(engine);

  const onSelectCloud = () => {
    setError(null);
    setSavedHint(null);
    setPreference('cloud');
    void (async () => {
      try {
        await saveDictationProviderPreference('cloud');
        await refreshActive();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not select Cloud.');
      }
    })();
  };

  const onSaveCloud = async () => {
    setError(null);
    setSavedHint(null);
    setBusy(true);
    try {
      await saveCloudSttConfig({ engine, apiKey, model, baseUrl });
      await saveDictationProviderPreference('cloud');
      setHasStoredKey(true);
      setPreference('cloud');
      await refreshActive();
      setSavedHint('Cloud dictation saved. New recordings use this engine.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save cloud STT settings.');
    } finally {
      setBusy(false);
    }
  };

  const onClearCloud = async () => {
    setError(null);
    setSavedHint(null);
    setBusy(true);
    try {
      await clearCloudSttConfig();
      await saveDictationProviderPreference(null);
      setApiKey('');
      setModel('');
      setBaseUrl('');
      setHasStoredKey(false);
      setPreference(null);
      await refreshActive();
      setSavedHint('Cloud key cleared. Dictation falls back to the demo stub (dev) or “none yet”.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not clear cloud STT settings.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Stack.Screen options={{ title: 'Settings' }} />
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={styles.root}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
      >
        <Stack.Screen options={{ title: 'Settings' }} />

        <Text style={styles.sectionTitle}>Dictation</Text>
        <Text style={styles.sectionBody}>
          Tap Mic on chat → stop → transcript sends as a normal prompt. Cloud STT runs on the phone
          against Groq or OpenAI — no Hermes Bot backend.
        </Text>

        {error ? <ErrorBanner message={error} /> : null}
        {savedHint ? <Text style={styles.savedHint}>{savedHint}</Text> : null}

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Active now</Text>
          <Text style={styles.cardValue}>{activeLabel}</Text>
          <Text style={styles.cardHint}>
            {preference === 'cloud'
              ? hasStoredKey
                ? 'Cloud engine is selected. Keys stay in Secure Store on this device.'
                : 'Cloud is selected — save an API key below before recording.'
              : stubOn
                ? 'Demo stub is on until you save Cloud below. Set EXPO_PUBLIC_DICTATION_STUB=0 for the “none yet” path.'
                : 'No engine selected — save Cloud below, or stop after recording shows a clear error.'}
          </Text>
        </View>

        {DICTATION_CATALOG.map((entry) => {
          const selected = entry.id === 'cloud' && preference === 'cloud';
          if (!entry.available) {
            return (
              <Pressable
                key={entry.id}
                disabled
                accessibilityState={{ disabled: true }}
                style={[styles.row, styles.rowDisabled]}
              >
                <View style={styles.rowBody}>
                  <Text style={styles.rowTitle}>{entry.label}</Text>
                  <Text style={styles.rowBlurb}>{entry.blurb}</Text>
                </View>
                <Text style={styles.coming}>Coming in follow-up</Text>
              </Pressable>
            );
          }

          return (
            <Pressable
              key={entry.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={onSelectCloud}
              style={[styles.row, selected && styles.rowSelected]}
            >
              <View style={styles.rowBody}>
                <Text style={styles.rowTitle}>{entry.label}</Text>
                <Text style={styles.rowBlurb}>{entry.blurb}</Text>
              </View>
              <Text style={selected ? styles.selectedBadge : styles.chooseBadge}>
                {selected ? 'Selected' : 'Select'}
              </Text>
            </Pressable>
          );
        })}

        {preference === 'cloud' ? (
          <View style={styles.cloudForm}>
            <Text style={styles.formTitle}>Cloud engine</Text>

            <View style={styles.engineRow}>
              {CLOUD_ENGINES.map((item) => {
                const on = item.id === engine;
                return (
                  <Pressable
                    key={item.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected: on }}
                    onPress={() => {
                      setEngine(item.id);
                      setSavedHint(null);
                    }}
                    style={[styles.engineChip, on && styles.engineChipOn]}
                  >
                    <Text style={[styles.engineChipLabel, on && styles.engineChipLabelOn]}>
                      {item.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Field
              label="API key"
              hint={
                engine === 'groq'
                  ? 'From console.groq.com — stored only in expo-secure-store on this phone.'
                  : 'From platform.openai.com — stored only in expo-secure-store on this phone.'
              }
            >
              <TextInput
                value={apiKey}
                onChangeText={setApiKey}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                placeholder={hasStoredKey && !apiKey ? '••••••••' : 'Paste API key'}
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />
            </Field>

            <Field
              label="Model"
              hint={`Default: ${engineMeta.defaultModel}. Tap a suggestion or type any model id.`}
            >
              <TextInput
                value={model}
                onChangeText={setModel}
                autoCapitalize="none"
                autoCorrect={false}
                placeholder={engineMeta.defaultModel}
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />
            </Field>

            <View style={styles.suggestRow}>
              {engineMeta.modelSuggestions.map((suggestion) => (
                <Pressable
                  key={suggestion}
                  onPress={() => setModel(suggestion)}
                  style={styles.suggestChip}
                >
                  <Text style={styles.suggestLabel}>{suggestion}</Text>
                </Pressable>
              ))}
            </View>

            <Field
              label="Base URL (optional)"
              hint={`OpenAI-compatible STT root. Blank uses ${engineMeta.defaultBaseUrl}`}
            >
              <TextInput
                value={baseUrl}
                onChangeText={setBaseUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                placeholder={engineMeta.defaultBaseUrl}
                placeholderTextColor={colors.textDim}
                style={styles.input}
              />
            </Field>

            <Button
              label={busy ? 'Saving…' : 'Save cloud dictation'}
              onPress={() => {
                void onSaveCloud();
              }}
              disabled={busy}
            />
            {hasStoredKey || preference === 'cloud' ? (
              <Button
                label="Clear cloud key"
                variant="ghost"
                onPress={() => {
                  void onClearCloud();
                }}
                disabled={busy}
                style={styles.clearBtn}
              />
            ) : null}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.bg,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sectionTitle: {
    color: colors.text,
    ...typography.title,
    marginBottom: spacing.xs,
  },
  sectionBody: {
    color: colors.textMuted,
    ...typography.body,
    marginBottom: spacing.md,
  },
  savedHint: {
    color: colors.success,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  cardLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  cardValue: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
  },
  cardHint: {
    color: colors.textMuted,
    ...typography.caption,
    marginTop: spacing.xs,
  },
  row: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  rowSelected: {
    borderColor: colors.accent,
  },
  rowDisabled: {
    opacity: 0.55,
  },
  rowBody: {
    gap: 4,
  },
  rowTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  rowBlurb: {
    color: colors.textMuted,
    ...typography.caption,
  },
  coming: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
  },
  chooseBadge: {
    color: colors.accent,
    fontSize: 12,
    fontWeight: '700',
  },
  selectedBadge: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  cloudForm: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  formTitle: {
    color: colors.text,
    fontSize: 17,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  engineRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  engineChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: colors.bgSoft,
  },
  engineChipOn: {
    borderColor: colors.accent,
    backgroundColor: colors.userBubble,
  },
  engineChipLabel: {
    color: colors.textMuted,
    fontWeight: '600',
    fontSize: 14,
  },
  engineChipLabelOn: {
    color: colors.accent,
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
  suggestRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  suggestChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: colors.bgElevated,
  },
  suggestLabel: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
  clearBtn: {
    marginTop: spacing.xs,
  },
});
