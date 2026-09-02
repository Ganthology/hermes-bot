import React, { useMemo } from 'react';
import { Linking, StyleSheet, Text } from 'react-native';
import { EnrichedMarkdownText, type MarkdownStyle } from 'react-native-enriched-markdown';
import Animated, { LinearTransition } from 'react-native-reanimated';
import remend from 'remend';

import { useRevealedText } from '../chat/assistantStream';
import { colors, radii, typography } from '../theme';

const growTransition = LinearTransition.duration(120);

/** Psyche ink / accent / soft field for native markdown (assistant only). */
const psycheMarkdownStyle: MarkdownStyle = {
  paragraph: {
    color: colors.text,
    fontSize: typography.body.fontSize,
    lineHeight: typography.body.lineHeight,
    marginTop: 0,
    marginBottom: 8,
  },
  h1: { color: colors.text, fontSize: 22, fontWeight: '700', marginBottom: 8 },
  h2: { color: colors.text, fontSize: 20, fontWeight: '700', marginBottom: 6 },
  h3: { color: colors.text, fontSize: 18, fontWeight: '600', marginBottom: 6 },
  h4: { color: colors.text, fontSize: 16, fontWeight: '600', marginBottom: 4 },
  link: {
    color: colors.accent,
    underline: true,
  },
  strong: { color: colors.text },
  em: { color: colors.text },
  code: {
    color: colors.text,
    backgroundColor: colors.bgSoft,
  },
  codeBlock: {
    color: colors.text,
    backgroundColor: colors.bgSoft,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: radii.sm,
    padding: 10,
    fontSize: 13,
    marginBottom: 8,
  },
  blockquote: {
    color: colors.textMuted,
    borderColor: colors.accent,
    borderWidth: 3,
    backgroundColor: colors.bgSoft,
    padding: 8,
    marginBottom: 8,
  },
  list: {
    color: colors.text,
    bulletColor: colors.accent,
    markerColor: colors.textMuted,
  },
  thematicBreak: {
    color: colors.border,
  },
};

const remendConfig = {
  bold: true,
  italic: true,
  boldItalic: true,
  strikethrough: true,
  links: true,
  linkMode: 'text-only' as const,
  images: true,
  inlineCode: true,
  katex: false,
  setextHeadings: true,
};

function healMarkdown(source: string): string {
  try {
    return remend(source, remendConfig);
  } catch {
    return source;
  }
}

function openLink(url: string) {
  if (url) {
    void Linking.openURL(url);
  }
}

/**
 * Live / dumped-complete text is revealed on RN Text so the bubble grows.
 * EnrichedMarkdown only mounts after the reveal catches up (it locks first height).
 */
export function StreamingMarkdown({
  markdown,
  streaming,
  smooth = false,
}: {
  markdown: string;
  streaming: boolean;
  smooth?: boolean;
}) {
  const style = useMemo(() => psycheMarkdownStyle, []);
  const { text: revealed, revealing } = useRevealedText(markdown, smooth);
  const livePaint = streaming || revealing;
  const painted = livePaint ? healMarkdown(revealed) : markdown;

  if (!painted) {
    return null;
  }

  return (
    <Animated.View layout={growTransition} style={styles.grow}>
      {livePaint ? (
        <Text selectable style={styles.live}>
          {painted}
        </Text>
      ) : (
        <EnrichedMarkdownText
          markdown={painted}
          flavor="github"
          markdownStyle={style}
          streamingAnimation={false}
          md4cFlags={{ latexMath: false }}
          onLinkPress={({ url }) => openLink(url)}
        />
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  grow: {
    alignSelf: 'stretch',
  },
  live: {
    color: colors.text,
    ...typography.body,
  },
});
