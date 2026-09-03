import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, View } from 'react-native';

import { fetchGatewayMediaDataUrl } from '../gateway/media';
import { colors, radii, spacing, typography } from '../theme';

/**
 * Renders a gateway-local image path via documented GET /api/media on :9119.
 * Skips quietly when the host lacks the endpoint or refuses the path.
 */
export function RemoteMediaImage({
  path,
  baseUrl,
  token,
}: {
  path: string;
  baseUrl: string;
  token: string;
}) {
  const [src, setSrc] = useState<string | null>(
    /^(?:https?:|data:)/i.test(path) ? path : null,
  );
  const [failed, setFailed] = useState(false);
  const [loading, setLoading] = useState(!/^(?:https?:|data:)/i.test(path));

  useEffect(() => {
    let cancelled = false;
    if (/^(?:https?:|data:)/i.test(path)) {
      setSrc(path);
      setLoading(false);
      setFailed(false);
      return;
    }

    setLoading(true);
    setFailed(false);
    (async () => {
      const dataUrl = await fetchGatewayMediaDataUrl(baseUrl, token, path);
      if (cancelled) {
        return;
      }
      if (dataUrl) {
        setSrc(dataUrl);
        setFailed(false);
      } else {
        setSrc(null);
        setFailed(true);
      }
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [baseUrl, path, token]);

  if (loading) {
    return (
      <View style={styles.placeholder}>
        <ActivityIndicator color={colors.accent} />
      </View>
    );
  }

  if (failed || !src) {
    return (
      <View style={styles.placeholder}>
        <Text style={styles.fallback} numberOfLines={2}>
          Image unavailable (host media endpoint refused or missing)
        </Text>
      </View>
    );
  }

  return (
    <Image
      source={{ uri: src }}
      style={styles.image}
      resizeMode="contain"
      accessibilityLabel="Attached image"
    />
  );
}

const styles = StyleSheet.create({
  image: {
    width: '100%',
    minHeight: 160,
    maxHeight: 320,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSoft,
    marginTop: spacing.sm,
  },
  placeholder: {
    minHeight: 72,
    marginTop: spacing.sm,
    borderRadius: radii.sm,
    backgroundColor: colors.bgSoft,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.sm,
  },
  fallback: {
    color: colors.textDim,
    ...typography.caption,
    textAlign: 'center',
  },
});
