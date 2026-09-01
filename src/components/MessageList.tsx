import React, { useRef, useEffect } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';

import type { MessageRecord } from '../storage/messages';
import type { InteractiveRequest } from '../gateway/types';
import { colors, radii, spacing, typography } from '../theme';
import { InteractiveCard } from './InteractiveCard';

export function MessageList({
  messages,
  interactive,
  onRespond,
  responding,
}: {
  messages: MessageRecord[];
  interactive: InteractiveRequest[];
  onRespond: (request: InteractiveRequest, payload: Record<string, unknown>) => Promise<void>;
  responding?: boolean;
}) {
  const listRef = useRef<FlatList<MessageRecord>>(null);

  const lastContent = messages[messages.length - 1]?.content;
  useEffect(() => {
    if (messages.length === 0) {
      return;
    }
    const timer = setTimeout(() => {
      listRef.current?.scrollToEnd({ animated: true });
    }, 50);
    return () => clearTimeout(timer);
  }, [messages.length, lastContent]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <Bubble message={item} />}
      ListFooterComponent={
        interactive.length ? (
          <View style={styles.footer}>
            {interactive.map((req) => (
              <InteractiveCard
                key={req.id}
                request={req}
                busy={responding}
                onRespond={(payload) => onRespond(req, payload)}
              />
            ))}
          </View>
        ) : null
      }
    />
  );
}

function Bubble({ message }: { message: MessageRecord }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
      <Text style={styles.role}>{isUser ? 'You' : message.role === 'assistant' ? 'Hermes' : message.role}</Text>
      <Text style={styles.body}>
        {message.content || (message.streaming ? '…' : '')}
        {message.streaming ? ' ▍' : ''}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
    gap: spacing.sm,
  },
  bubble: {
    borderRadius: radii.lg,
    padding: spacing.md,
    maxWidth: '92%',
  },
  user: {
    alignSelf: 'flex-end',
    backgroundColor: colors.userBubble,
  },
  assistant: {
    alignSelf: 'flex-start',
    backgroundColor: colors.assistantBubble,
    borderWidth: 1,
    borderColor: colors.border,
  },
  role: {
    color: colors.textDim,
    fontSize: 11,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  body: {
    color: colors.text,
    ...typography.body,
  },
  footer: {
    marginTop: spacing.sm,
  },
});
