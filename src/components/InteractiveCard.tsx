import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import type { InteractiveRequest } from '../gateway/types';
import { colors, radii, spacing, typography } from '../theme';
import { Button } from './ui';
import { coerceText } from '../utils/text';

function pickString(payload: Record<string, unknown>, keys: string[]): string | null {
  for (const key of keys) {
    const value = payload[key];
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function titleFor(kind: InteractiveRequest['kind']): string {
  switch (kind) {
    case 'approval':
      return 'Approval needed';
    case 'clarify':
      return 'Quick question';
    case 'sudo':
      return 'Password needed';
    case 'secret':
      return 'Secret needed';
    default: {
      const _exhaustive: never = kind;
      return _exhaustive;
    }
  }
}

export function InteractiveCard({
  request,
  onRespond,
  busy,
}: {
  request: InteractiveRequest;
  onRespond: (payload: Record<string, unknown>) => Promise<void>;
  busy?: boolean;
}) {
  const [text, setText] = useState('');
  const prompt = useMemo(() => {
    const p = request.payload;
    return (
      pickString(p, ['prompt', 'question', 'message', 'command', 'text', 'reason', 'title']) ??
      coerceText(p.prompt ?? p.question ?? p.message ?? p.command ?? '')
    );
  }, [request.payload]);

  const choices = useMemo(() => {
    const raw = request.payload.choices ?? request.payload.options;
    if (!Array.isArray(raw)) {
      return null;
    }
    return raw
      .map((item) => {
        if (typeof item === 'string') {
          return item;
        }
        if (item && typeof item === 'object') {
          const obj = item as Record<string, unknown>;
          return pickString(obj, ['label', 'value', 'text', 'id']) ?? null;
        }
        return null;
      })
      .filter((v): v is string => Boolean(v));
  }, [request.payload]);

  return (
    <View style={styles.card}>
      <Text style={styles.kind}>{titleFor(request.kind)}</Text>
      {prompt ? <Text style={styles.prompt}>{prompt}</Text> : null}

      {request.kind === 'approval' ? (
        <View style={styles.row}>
          <Button
            label="Allow"
            disabled={busy}
            onPress={() =>
              onRespond({
                session_id: request.sessionId,
                request_id: request.requestId,
                choice: 'allow',
              })
            }
            style={styles.flex}
          />
          <Button
            label="Deny"
            variant="ghost"
            disabled={busy}
            onPress={() =>
              onRespond({
                session_id: request.sessionId,
                request_id: request.requestId,
                choice: 'deny',
              })
            }
            style={styles.flex}
          />
        </View>
      ) : null}

      {request.kind === 'clarify' ? (
        <View style={styles.stack}>
          {choices?.length ? (
            choices.map((choice) => (
              <Button
                key={choice}
                label={choice}
                variant="ghost"
                disabled={busy}
                onPress={() =>
                  onRespond({
                    session_id: request.sessionId,
                    request_id: request.requestId,
                    answer: choice,
                  })
                }
              />
            ))
          ) : (
            <>
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Your answer"
                placeholderTextColor={colors.textDim}
                style={styles.input}
                editable={!busy}
              />
              <Button
                label="Send answer"
                disabled={busy || !text.trim()}
                onPress={() =>
                  onRespond({
                    session_id: request.sessionId,
                    request_id: request.requestId,
                    answer: text.trim(),
                  })
                }
              />
            </>
          )}
        </View>
      ) : null}

      {request.kind === 'sudo' || request.kind === 'secret' ? (
        <View style={styles.stack}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={request.kind === 'sudo' ? 'Password' : 'Secret value'}
            placeholderTextColor={colors.textDim}
            style={styles.input}
            secureTextEntry
            editable={!busy}
          />
          <Button
            label="Submit"
            disabled={busy || !text.trim()}
            onPress={() =>
              onRespond(
                request.kind === 'sudo'
                  ? {
                      session_id: request.sessionId,
                      request_id: request.requestId,
                      password: text,
                    }
                  : {
                      session_id: request.sessionId,
                      request_id: request.requestId,
                      value: text,
                    },
              )
            }
          />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  kind: {
    color: colors.warning,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.4,
    textTransform: 'uppercase',
  },
  prompt: {
    color: colors.text,
    ...typography.body,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  flex: {
    flex: 1,
  },
  stack: {
    gap: spacing.sm,
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
});
