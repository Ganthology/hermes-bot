import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { Stack, router, useLocalSearchParams, useNavigation } from 'expo-router';
import { KeyboardAvoidingView } from 'react-native-keyboard-controller';

import { mergeAssistantContent } from '../../../src/chat/assistantStream';
import {
  formatUserMessageContent,
  syncAttachmentsForSubmit,
  type StagedAttachment,
} from '../../../src/chat/attachments';
import {
  applyReasoningDelta,
  applyStatusUpdate,
  applyThinkingDelta,
  applyToolComplete,
  applyToolGenerating,
  applyToolProgress,
  applyToolStart,
  beginTurn,
  emptyTurnActivity,
  endTurn,
  type TurnActivityState,
} from '../../../src/chat/turnActivity';
import { Composer } from '../../../src/components/Composer';
import { MessageList } from '../../../src/components/MessageList';
import { ErrorBanner } from '../../../src/components/ui';
import {
  approvalRespond,
  clarifyRespond,
  promptSubmit,
  secretRespond,
  sessionHistory,
  sessionResume,
  sudoRespond,
} from '../../../src/gateway/methods';
import type { GatewayEvent, InteractiveRequest } from '../../../src/gateway/types';
import { openChatForHostAgent } from '../../../src/profiles';
import { useAgents } from '../../../src/state/AgentsProvider';
import { useGateway } from '../../../src/state/GatewayProvider';
import { getAgent, getAgentByProfileName, type AgentRecord } from '../../../src/storage/agents';
import {
  insertMessage,
  listMessages,
  replaceMessagesFromHistory,
  updateMessageContent,
  type MessageRecord,
} from '../../../src/storage/messages';
import { colors, spacing, typography } from '../../../src/theme';
import { coerceText, createId } from '../../../src/utils/text';

async function resolveAgentRecord(routeId: string): Promise<AgentRecord | null> {
  const byId = await getAgent(routeId);
  if (byId) {
    return byId;
  }
  return getAgentByProfileName(routeId);
}

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
  const routeId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const { ensureConnected, client, credentials } = useGateway();
  const { patchSessions, bumpAgent } = useAgents();
  const navigation = useNavigation();

  const [agentId, setAgentId] = useState(routeId);
  const [hostProfileId, setHostProfileId] = useState<string | null>(null);
  const [title, setTitle] = useState('Chat');
  const [messages, setMessages] = useState<MessageRecord[]>([]);
  const [interactive, setInteractive] = useState<InteractiveRequest[]>([]);
  const [liveSessionId, setLiveSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activity, setActivity] = useState<TurnActivityState>(() => emptyTurnActivity());

  const streamingIdRef = useRef<string | null>(null);
  const liveSessionRef = useRef<string | null>(null);
  const storedSessionRef = useRef<string | null>(null);

  useLayoutEffect(() => {
    const editId = hostProfileId ?? routeId;
    navigation.setOptions({
      headerRight: () => (
        <Pressable
          onPress={() => router.push(`/agents/${encodeURIComponent(editId)}/edit`)}
          hitSlop={8}
        >
          <Text style={styles.headerAction}>Edit</Text>
        </Pressable>
      ),
    });
  }, [navigation, hostProfileId, routeId]);

  const upsertStreaming = useCallback((agentKey: string, chunk: string, done: boolean) => {
    let id = streamingIdRef.current;
    if (!id) {
      id = createId('msg');
      streamingIdRef.current = id;
      const created: MessageRecord = {
        id,
        agentId: agentKey,
        role: 'assistant',
        content: chunk,
        remoteRowId: null,
        createdAt: Date.now(),
        streaming: !done,
        live: true,
      };
      setMessages((prev) => [...prev, created]);
      void insertMessage({
        id: created.id,
        agentId: created.agentId,
        role: created.role,
        content: created.content,
        createdAt: created.createdAt,
        streaming: created.streaming,
      });
    } else {
      const streamId = id;
      setMessages((prev) => {
        const next = prev.map((m) => {
          if (m.id !== streamId) {
            return m;
          }
          return {
            ...m,
            content: mergeAssistantContent(m.content, chunk, done ? 'settle' : 'append'),
            streaming: !done,
            live: true,
          };
        });
        const current = next.find((m) => m.id === streamId);
        if (current) {
          void updateMessageContent(streamId, current.content, !done);
        }
        return next;
      });
    }

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
        case 'message.start': {
          setActivity((prev) => beginTurn(prev));
          break;
        }
        case 'message.delta': {
          // Prefer text — rendered is TUI ANSI, not markdown source.
          const text = coerceText(payload.text ?? payload.content ?? payload.delta);
          if (text) {
            setActivity((prev) => (prev.active ? prev : beginTurn(prev)));
            upsertStreaming(agentId, text, false);
          }
          break;
        }
        case 'message.complete': {
          const text = coerceText(payload.text ?? payload.content);
          if (streamingIdRef.current || text) {
            upsertStreaming(agentId, text, true);
          }
          setActivity(endTurn());
          setSending(false);
          break;
        }
        case 'thinking.delta': {
          // Status caption only — not model reasoning (see hermes-agent thinking_callback).
          setActivity((prev) => applyThinkingDelta(prev, coerceText(payload.text)));
          break;
        }
        case 'reasoning.delta':
        case 'reasoning.available': {
          setActivity((prev) => applyReasoningDelta(prev, coerceText(payload.text)));
          break;
        }
        case 'status.update': {
          const kind = typeof payload.kind === 'string' ? payload.kind : null;
          const text = coerceText(payload.text) || null;
          setActivity((prev) => applyStatusUpdate(prev, kind, text));
          break;
        }
        case 'tool.start': {
          const toolId = coerceText(payload.tool_id);
          const name = coerceText(payload.name) || 'tool';
          const preview = coerceText(payload.args_text || payload.context) || undefined;
          setActivity((prev) => applyToolStart(prev, toolId, name, preview));
          break;
        }
        case 'tool.progress': {
          const name = coerceText(payload.name) || null;
          const preview = coerceText(payload.preview) || null;
          setActivity((prev) => applyToolProgress(prev, name, preview));
          break;
        }
        case 'tool.generating': {
          const name = coerceText(payload.name) || 'tool';
          setActivity((prev) => applyToolGenerating(prev, name));
          break;
        }
        case 'tool.complete': {
          const toolId = coerceText(payload.tool_id);
          const name = coerceText(payload.name) || 'tool';
          const summary =
            coerceText(payload.summary || payload.result_text) || undefined;
          const err = coerceText(payload.error) || undefined;
          setActivity((prev) => applyToolComplete(prev, toolId, name, summary, err));
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
        case 'error': {
          const message = coerceText(payload.message ?? payload.error ?? 'Gateway error');
          setError(message || 'Gateway error');
          setActivity(endTurn());
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
        let agent = await resolveAgentRecord(routeId);
        const gw = await ensureConnected();
        if (cancelled) {
          return;
        }

        if (!agent || !agent.storedSessionId) {
          const hostId = agent?.profileName ?? routeId;
          const displayName = agent?.name ?? routeId;
          const description = agent?.description ?? '';
          const opened = await openChatForHostAgent({
            hostId,
            displayName,
            description,
            client: gw,
          });
          agent = await getAgent(opened.localAgentId);
          if (!agent) {
            throw new Error('Could not open this agent.');
          }
        }

        if (cancelled) {
          return;
        }

        setAgentId(agent.id);
        setHostProfileId(agent.profileName ?? routeId);
        setTitle(agent.name);
        storedSessionRef.current = agent.storedSessionId;
        const cached = await listMessages(agent.id);
        if (!cancelled) {
          setMessages(cached);
        }

        offEvent = gw.on('*', handleGatewayEvent);

        if (!agent.storedSessionId) {
          throw new Error('This agent has no chat yet. Try opening them again.');
        }

        const resumed = await sessionResume(gw, {
          session_id: agent.storedSessionId,
          ...(agent.profileName ? { profile: agent.profileName } : {}),
        });

        const liveId = resumed.session_id;
        liveSessionRef.current = liveId;
        setLiveSessionId(liveId);
        await patchSessions(agent.id, {
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
          const reconciled = await replaceMessagesFromHistory(agent.id, historyMessages);
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
  }, [routeId, ensureConnected, handleGatewayEvent, patchSessions]);

  const onSend = async (text: string, attachments: StagedAttachment[] = []) => {
    setError(null);
    setSending(true);
    streamingIdRef.current = null;
    setActivity((prev) => beginTurn(prev));
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

      // Attach all staged items before submit. Any failure aborts — no half-prompt.
      let submitText = text.trim();
      let synced: StagedAttachment[] = [];
      if (attachments.length > 0) {
        const result = await syncAttachmentsForSubmit(gw, sid, attachments);
        synced = result.attachments;
        submitText = result.promptText(text);
      }
      if (!submitText) {
        throw new Error('Nothing to send');
      }

      const userMessage = await insertMessage({
        agentId,
        role: 'user',
        content: formatUserMessageContent(text, synced.length ? synced : attachments),
      });
      setMessages((prev) => [...prev, userMessage]);
      await bumpAgent(agentId);
      await promptSubmit(gw, { session_id: sid, text: submitText });
    } catch (err) {
      setSending(false);
      setActivity(endTurn());
      setError(err instanceof Error ? err.message : 'Send failed');
      throw err;
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
      behavior="padding"
      automaticOffset
    >
      <Stack.Screen
        options={{ title, headerBackButtonDisplayMode: 'minimal' }}
      />
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
          activity={activity}
          header={error ? <ErrorBanner message={error} /> : null}
          mediaCredentials={credentials}
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
  headerAction: {
    color: colors.accent,
    fontWeight: '600',
    paddingHorizontal: spacing.sm,
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
