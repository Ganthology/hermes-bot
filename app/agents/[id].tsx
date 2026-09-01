import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams, useNavigation } from 'expo-router';

import { Composer } from '../../src/components/Composer';
import { MessageList } from '../../src/components/MessageList';
import { ErrorBanner } from '../../src/components/ui';
import {
  approvalRespond,
  clarifyRespond,
  promptSubmit,
  secretRespond,
  sessionHistory,
  sessionResume,
  sudoRespond,
} from '../../src/gateway/methods';
import type { GatewayEvent, InteractiveRequest } from '../../src/gateway/types';
import { useAgents } from '../../src/state/AgentsProvider';
import { useGateway } from '../../src/state/GatewayProvider';
import { getAgent } from '../../src/storage/agents';
import {
  insertMessage,
  listMessages,
  replaceMessagesFromHistory,
  updateMessageContent,
  type MessageRecord,
} from '../../src/storage/messages';
import { colors, spacing, typography } from '../../src/theme';
import { coerceText, createId } from '../../src/utils/text';

function requestIdFromPayload(payload: Record<string, unknown> | undefined): string {
  if (!payload) {
    return createId('req');
  }
  const candidates = [payload.request_id, payload.id, payload.prompt_id];
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }
  return createId('req');
}

export default function AgentChatScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const agentId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const navigation = useNavigation();
  const { ensureConnected, client } = useGateway();
  const { patchSessions, bumpAgent } = useAgents();

  const [title, setTitle] = useState('Chat');
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [interactive, setInteractive] = useState<InteractiveRequest[]>([]);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streamingIdRef = useRef<string | null>(null);
  const liveSessionRef = useRef<string | null>(null);
  const storedSessionRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title });
  }, [navigation, title]);

  const upsertStreaming = useCallback(async (agentKey: string, chunk: string, done: boolean) => {
    const existingId = streamingIdRef.current;
    if (!existingId) {
      const created = await insertMessage({
        agentId: agentKey,
        role: 'assistant',
        content: chunk,
        streaming: !done,
      });
      streamingIdRef.current = done ? null : created.id;
      setMessages((prev) => [...prev.filter((m) => m.id !== created.id), created]);
      return;
    }

    setMessages((prev) => {
      const next = prev.map((m) =>
        m.id === existingId
          ? { ...m, content: m.content + chunk, streaming: !done }
          : m,
      );
      const current = next.find((m) => m.id === existingId);
      if (current) {
        void updateMessageContent(existingId, current.content, !done);
      }
      return next;
    });

    if (done) {
      streamingIdRef.current = null;
    }
  }, []);

  const handleGatewayEvent = useCallback(
    (event: GatewayEvent) => {
      const sid = event.session_id;
      if (sid && liveSessionRef.current && sid !== liveSessionRef.current) {
        return;
      }

      const payload =
        event.payload && typeof event.payload === 'object'
          ? (event.payload as Record<string, unknown>)
          : {};

      switch (event.type) {
        case 'message.delta': {
          const text = coerceText(payload.text ?? payload.content ?? payload.delta);
          if (text) {
            void upsertStreaming(agentId, text, false);
          }
          break;
        }
        case 'message.complete': {
          const text = coerceText(payload.text ?? payload.content);
          if (text && !streamingIdRef.current) {
            void upsertStreaming(agentId, text, true);
          } else if (streamingIdRef.current) {
            void upsertStreaming(agentId, '', true);
          }
          setSending(false);
          break;
        }
        case 'approval.request':
        case 'clarify.request':
        case 'sudo.request':
        case 'secret.request': {
          const kind =
            event.type === 'approval.request'
              ? 'approval'
              : event.type === 'clarify.request'
                ? 'clarify'
                : event.type === 'sudo.request'
                  ? 'sudo'
                  : 'secret';
          const req: InteractiveRequest = {
            id: createId('interactive'),
            kind,
            sessionId: sid ?? liveSessionRef.current ?? undefined,
            requestId: requestIdFromPayload(payload),
            payload,
            createdAt: Date.now(),
          };
          setInteractive((prev) => [...prev.filter((p) => p.requestId !== req.requestId), req]);
          break;
        }
        case 'sudo.expire':
        case 'secret.expire': {
          const expiredId = requestIdFromPayload(payload);
          setInteractive((prev) => prev.filter((p) => p.requestId !== expiredId));
          break;
        }
        case 'tool.start':
        case 'tool.progress':
        case 'tool.complete':
          // Visible later; v1 keeps the transcript focused on chat text + cards.
          break;
        case 'error': {
          const message = coerceText(payload.message ?? payload.error ?? 'Gateway error');
          setError(message || 'Gateway error');
          setSending(false);
          break;
        }
        default:
          break;
      }
    },
    [agentId, upsertStreaming],
  );

  useEffect(() => {
    let cancelled = false;
    let offEvent: (() => void) | undefined;

    (async () => {
      setLoading(true);
      setError(null);
      try {
        const agent = await getAgent(agentId);
        if (!agent) {
          throw new Error('Agent not found');
        }
        if (cancelled) {
          return;
        }
        setTitle(agent.name);
        storedSessionRef.current = agent.storedSessionId;
        const cached = await listMessages(agentId);
        if (!cancelled) {
          setMessages(cached);
        }

        const gw = await ensureConnected();
        if (cancelled) {
          return;
        }
        offEvent = gw.on('*', handleGatewayEvent);

        if (!agent.storedSessionId) {
          throw new Error('This agent has no pinned chat on the Hermes host.');
        }

        const resumed = await sessionResume(gw, {
          session_id: agent.storedSessionId,
          ...(agent.profileName ? { profile: agent.profileName } : {}),
        });

        const liveId = resumed.session_id;
        liveSessionRef.current = liveId;
        setLiveSessionId(liveId);
        await patchSessions(agentId, {
          liveSessionId: liveId,
          storedSessionId: resumed.stored_session_id ?? agent.storedSessionId,
        });
        storedSessionRef.current = resumed.stored_session_id ?? agent.storedSessionId;

        let historyMessages = resumed.messages;
        if (!historyMessages || resumed.hydrating || resumed.messages_omitted) {
          const history = await sessionHistory(gw, liveId);
          historyMessages = history.messages ?? [];
        }

        if (historyMessages && historyMessages.length > 0) {
          const reconciled = await replaceMessagesFromHistory(agentId, historyMessages);
          if (!cancelled) {
            setMessages(reconciled);
          }
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Could not open chat');
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
      offEvent?.();
    };
  }, [agentId, ensureConnected, handleGatewayEvent, patchSessions]);

  const onSend = async (text: string) => {
    setError(null);
    setSending(true);
    streamingIdRef.current = null;
    try {
      const gw = await ensureConnected();
      let sid = liveSessionRef.current;
      if (!sid && storedSessionRef.current) {
        const resumed = await sessionResume(gw, { session_id: storedSessionRef.current });
        sid = resumed.session_id;
        liveSessionRef.current = sid;
        setLiveSessionId(sid);
      }
      if (!sid) {
        throw new Error('No live chat id — reconnect and try again');
      }

      const userMessage = await insertMessage({
        agentId,
        role: 'user',
        content: text,
      });
      setMessages((prev) => [...prev, userMessage]);
      await bumpAgent(agentId);
      await promptSubmit(gw, { session_id: sid, text });
    } catch (err) {
      setSending(false);
      setError(err instanceof Error ? err.message : 'Send failed');
    }
  };

  const onRespond = async (request: InteractiveRequest, payload: Record<string, unknown>) => {
    setResponding(true);
    setError(null);
    try {
      const gw = client ?? (await ensureConnected());
      switch (request.kind) {
        case 'approval':
          await approvalRespond(gw, {
            session_id:
              typeof payload.session_id === 'string'
                ? payload.session_id
                : request.sessionId ?? liveSessionRef.current ?? '',
            ...payload,
          });
          break;
        case 'clarify':
          await clarifyRespond(gw, payload as { request_id: string; answer?: string });
          break;
        case 'sudo':
          await sudoRespond(gw, payload as { request_id: string; password?: string });
          break;
        case 'secret':
          await secretRespond(gw, payload as { request_id: string; value?: string });
          break;
        default: {
          const _exhaustive: never = request.kind;
          return _exhaustive;
        }
      }
      setInteractive((prev) => prev.filter((p) => p.id !== request.id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Response failed');
    } finally {
      setResponding(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={88}
    >
      <Stack.Screen options={{ title }} />
      {error ? (
        <View style={styles.banner}>
          <ErrorBanner message={error} />
        </View>
      ) : null}

      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={colors.accent} />
          <Text style={styles.loadingText}>Opening chat…</Text>
        </View>
      ) : (
        <MessageList
          messages={messages}
          interactive={interactive}
          responding={responding}
          onRespond={onRespond}
        />
      )}

      <Composer
        onSend={onSend}
        disabled={loading || !liveSessionId}
        sending={sending}
      />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  banner: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
  },
  loading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  loadingText: {
    color: colors.textMuted,
    ...typography.caption,
  },
});
