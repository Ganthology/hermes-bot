import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  workingCaption,
  type ToolCallRow,
  type TurnActivityState,
} from '../chat/turnActivity';
import { colors, radii, spacing, typography } from '../theme';

export function TurnActivityPanel({ activity }: { activity: TurnActivityState }) {
  const caption = workingCaption(activity);
  const hasBody =
    Boolean(activity.reasoning) || activity.tools.length > 0 || Boolean(caption);

  if (!activity.active && !hasBody) {
    return null;
  }

  if (!activity.active) {
    return null;
  }

  return (
    <View style={styles.root} accessibilityLiveRegion="polite">
      {caption ? (
        <View style={styles.statusRow}>
          <View style={styles.dot} />
          <Text style={styles.statusText}>{caption}</Text>
        </View>
      ) : null}

      {activity.reasoning ? <ReasoningBlock text={activity.reasoning} /> : null}

      {activity.tools.map((tool) => (
        <ToolRow key={tool.toolId} tool={tool} />
      ))}
    </View>
  );
}

function ReasoningBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(true);
  return (
    <View style={styles.block}>
      <Pressable
        onPress={() => setOpen((v) => !v)}
        accessibilityRole="button"
        style={styles.blockHeader}
      >
        <Text style={styles.blockTitle}>{open ? '▾' : '▸'} Thought process</Text>
      </Pressable>
      {open ? <Text style={styles.reasoning}>{text}</Text> : null}
    </View>
  );
}

function ToolRow({ tool }: { tool: ToolCallRow }) {
  const label =
    tool.status === 'running'
      ? tool.name
      : tool.status === 'error'
        ? `${tool.name} failed`
        : `${tool.name} done`;
  const detail = tool.error || tool.summary || tool.preview;

  return (
    <View style={styles.toolRow}>
      <Text style={styles.toolName}>{label}</Text>
      {detail ? (
        <Text style={styles.toolDetail} numberOfLines={3}>
          {detail}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  statusText: {
    color: colors.textMuted,
    ...typography.caption,
    flexShrink: 1,
  },
  block: {
    backgroundColor: colors.bgSoft,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  blockHeader: {
    paddingVertical: 2,
  },
  blockTitle: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  reasoning: {
    color: colors.textMuted,
    ...typography.caption,
  },
  toolRow: {
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
    paddingLeft: spacing.sm,
    gap: 2,
  },
  toolName: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },
  toolDetail: {
    color: colors.textDim,
    ...typography.caption,
  },
});
