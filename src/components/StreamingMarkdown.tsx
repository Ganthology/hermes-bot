import React, { useMemo } from 'react';
import { Linking, StyleSheet } from 'react-native';
import { EnrichedMarkdownText, type MarkdownStyle } from 'react-native-enriched-markdown';
import { StreamdownText } from 'react-native-streamdown';

import { colors, radii, typography } from '../theme';

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

function openLink(url: string) {
  if (url) {
    void Linking.openURL(url);
  }
}

/**
 * Live-token markdown via Software Mansion StreamdownText while streaming
 * (remend off-thread + streamingAnimation). Frozen messages use EnrichedMarkdownText.
 */
export function StreamingMarkdown({
  markdown,
  streaming,
}: {
  markdown: string;
  streaming: boolean;
}) {
  const style = useMemo(() => psycheMarkdownStyle, []);
  const shared = {
    flavor: 'github' as const,
    markdownStyle: style,
    containerStyle: styles.container,
    onLinkPress: ({ url }: { url: string }) => openLink(url),
  };

  if (streaming) {
    return (
      <StreamdownText
        markdown={markdown}
        streamingConfig={{ tableMode: 'progressive', codeBlockMode: 'progressive' }}
        {...shared}
      />
    );
  }

  return (
    <EnrichedMarkdownText
      markdown={markdown}
      streamingAnimation={false}
      {...shared}
    />
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
