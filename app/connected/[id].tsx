import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useLocalSearchParams } from 'expo-router';

import {
  statusLabel,
  wiringLabel,
} from '../../src/connected/inferConnectedServices';
import { loadConnectedServices } from '../../src/connected/loadConnectedServices';
import type { ConnectedService } from '../../src/connected/types';
import { ErrorBanner } from '../../src/components/ui';
import { useGateway } from '../../src/state/GatewayProvider';
import { colors, radii, spacing, typography } from '../../src/theme';

function statusColor(status: ConnectedService['status']): string {
  switch (status) {
    case 'connected':
      return colors.success;
    case 'not_connected':
      return colors.textDim;
    case 'unknown':
      return colors.warning;
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export default function ConnectedServiceDetailScreen() {
  const { id, profile } = useLocalSearchParams<{ id: string; profile?: string }>();
  const serviceId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : '';
  const profileName =
    typeof profile === 'string' && profile.trim() ? profile.trim() : null;
  const { ensureConnected } = useGateway();

  const [service, setService] = useState<ConnectedService | null>(null);
  const [scopeLabel, setScopeLabel] = useState('Host / profile');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const client = await ensureConnected();
      const snapshot = await loadConnectedServices(client, { profileName });
      setScopeLabel(snapshot.scopeLabel);
      const found = snapshot.services.find((s) => s.id === serviceId) ?? null;
      setService(found);
      if (!found) {
        setError('This service is not on the current host snapshot.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load service detail');
    } finally {
      setLoading(false);
    }
  }, [ensureConnected, profileName, serviceId]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.root}>
      <Stack.Screen options={{ title: service?.name ?? 'Service' }} />
      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentInsetAdjustmentBehavior="automatic"
          contentContainerStyle={styles.content}
        >
          {error ? <ErrorBanner message={error} /> : null}
          {service ? (
            <>
              <Text style={styles.scope}>{scopeLabel}</Text>
              <Text style={styles.title}>{service.name}</Text>
              <Text style={[styles.status, { color: statusColor(service.status) }]}>
                {statusLabel(service.status)}
              </Text>
              <Text style={styles.enables}>{service.enables}</Text>
              <Text style={styles.wiring}>Wired via {wiringLabel(service.wiring)}</Text>

              <Text style={styles.section}>Evidence</Text>
              <View style={styles.card}>
                {service.evidence.skillNames.length > 0 ? (
                  <EvidenceLine
                    label="Skills"
                    value={service.evidence.skillNames.join(', ')}
                  />
                ) : null}
                {service.evidence.mcpServerName ? (
                  <EvidenceLine label="MCP server" value={service.evidence.mcpServerName} />
                ) : null}
                {service.evidence.mcpToolsetName ? (
                  <EvidenceLine label="Toolset" value={service.evidence.mcpToolsetName} />
                ) : null}
                {service.evidence.catalogInstalled != null ? (
                  <EvidenceLine
                    label="Catalog installed"
                    value={service.evidence.catalogInstalled ? 'yes' : 'no'}
                  />
                ) : null}
                {service.evidence.catalogEnabled != null ? (
                  <EvidenceLine
                    label="Catalog enabled"
                    value={service.evidence.catalogEnabled ? 'yes' : 'no'}
                  />
                ) : null}
                {service.evidence.mcpEnabled != null ? (
                  <EvidenceLine
                    label="MCP enabled"
                    value={service.evidence.mcpEnabled ? 'yes' : 'no'}
                  />
                ) : null}
                {service.evidence.oauthTokensPresent != null ? (
                  <EvidenceLine
                    label="OAuth tokens present"
                    value={service.evidence.oauthTokensPresent ? 'yes' : 'no'}
                  />
                ) : null}
                {service.evidence.cliAuthNote ? (
                  <EvidenceLine label="CLI auth" value={service.evidence.cliAuthNote} />
                ) : null}
                {!hasAnyEvidence(service) ? (
                  <Text style={styles.emptyEvidence}>No structured evidence from the host.</Text>
                ) : null}
              </View>
              <Text style={styles.footnote}>
                Read-only. Secrets and tokens are never shown. Connect or install services on the
                Hermes host.
              </Text>
            </>
          ) : null}
        </ScrollView>
      )}
    </View>
  );
}

function hasAnyEvidence(service: ConnectedService): boolean {
  const e = service.evidence;
  return (
    e.skillNames.length > 0 ||
    e.mcpServerName != null ||
    e.mcpToolsetName != null ||
    e.catalogInstalled != null ||
    e.catalogEnabled != null ||
    e.mcpEnabled != null ||
    e.oauthTokensPresent != null ||
    e.cliAuthNote != null
  );
}

function EvidenceLine({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.evidenceRow}>
      <Text style={styles.evidenceLabel}>{label}</Text>
      <Text style={styles.evidenceValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    padding: spacing.md,
    paddingBottom: spacing.xxl,
    gap: spacing.sm,
  },
  scope: {
    color: colors.textDim,
    ...typography.caption,
  },
  title: {
    color: colors.text,
    ...typography.title,
  },
  status: {
    fontWeight: '700',
    fontSize: 15,
  },
  enables: {
    color: colors.textMuted,
    ...typography.body,
  },
  wiring: {
    color: colors.textDim,
    ...typography.caption,
    marginBottom: spacing.sm,
  },
  section: {
    color: colors.text,
    fontWeight: '600',
    fontSize: 15,
    marginTop: spacing.sm,
  },
  card: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.md,
    gap: spacing.md,
  },
  evidenceRow: {
    gap: 4,
  },
  evidenceLabel: {
    color: colors.textDim,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  evidenceValue: {
    color: colors.text,
    ...typography.body,
  },
  emptyEvidence: {
    color: colors.textMuted,
    ...typography.caption,
  },
  footnote: {
    color: colors.textDim,
    ...typography.caption,
    marginTop: spacing.md,
  },
});
