import React, { useCallback, useEffect, useRef } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import type { TurnActivityState } from '../chat/turnActivity';
import type { MessageRecord } from '../storage/messages';
import type { InteractiveRequest } from '../gateway/types';
import { colors, radii, spacing, typography } from '../theme';
import { InteractiveCard } from './InteractiveCard';
import { StreamingMarkdown } from './StreamingMarkdown';
import { TurnActivityPanel } from './TurnActivityPanel';

const NEAR_BOTTOM_PX = 96;

export function MessageList({
  messages,
  interactive,
  onRespond,
  responding,
  activity,
}: {
  messages: MessageRecord[];
  interactive: InteractiveRequest[];
  onRespond: (request: InteractiveRequest, payload: Record<string, unknown>) => Promise<void>;
  responding?: boolean;
  activity: TurnActivityState;
}) {
  const listRef = useRef<FlatList<MessageRecord>>(null);
  const pinnedToBottomRef = useRef(true);

  const lastContent = messages[messages.length - 1]?.content;
  const lastStreaming = messages[messages.length - 1]?.streaming;
  const activityKey = `${activity.active}:${activity.thinkingLabel ?? ''}:${activity.reasoning.length}:${activity.tools.length}`;

  const scrollToEndIfPinned = useCallback((animated: boolean) => {
    if (!pinnedToBottomRef.current) {
      return;
    }
    listRef.current?.scrollToEnd({ animated });
  }, []);

  useEffect(() => {
    if (messages.length === 0 && !activity.active) {
      return;
    }
    const timer = setTimeout(() => {
      scrollToEndIfPinned(true);
    }, 40);
    return () => clearTimeout(timer);
  }, [
    messages.length,
    lastContent,
    lastStreaming,
    activity.active,
    activityKey,
    interactive.length,
    scrollToEndIfPinned,
  ]);

  const onScroll = useCallback((event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const { contentOffset, layoutMeasurement, contentSize } = event.nativeEvent;
    const distanceFromBottom =
      contentSize.height - layoutMeasurement.height - contentOffset.y;
    pinnedToBottomRef.current = distanceFromBottom <= NEAR_BOTTOM_PX;
  }, []);

  const onContentSizeChange = useCallback(() => {
    scrollToEndIfPinned(false);
  }, [scrollToEndIfPinned]);

  return (
    <FlatList
      ref={listRef}
      data={messages}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.content}
      renderItem={({ item }) => <Bubble message={item} />}
      onScroll={onScroll}
      scrollEventThrottle={16}
      onContentSizeChange={onContentSizeChange}
      ListFooterComponent={
        <View style={styles.footer}>
          <TurnActivityPanel activity={activity} />
          {interactive.length
            ? interactive.map((req) => (
                <InteractiveCard
                  key={req.id}
                  request={req}
                  busy={responding}
                  onRespond={(payload) => onRespond(req, payload)}
                />
              ))
            : null}
        </View>
      }
    />
  );
}

function Bubble({ message }: { message: MessageRecord }) {
  const isUser = message.role === 'user';
  return (
    <View style={[styles.bubble, isUser ? styles.user : styles.assistant]}>
      <Text style={styles.role}>
        {isUser ? 'You' : message.role === 'assistant' ? 'Hermes' : message.role}
      </Text>
      {isUser ? (
        <Text style={styles.body}>{message.content}</Text>
      ) : (
        <StreamingMarkdown markdown={message.content} streaming={message.streaming} />
      )}
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
    gap: spacing.sm,
  },
});
