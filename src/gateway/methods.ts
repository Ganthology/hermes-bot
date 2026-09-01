import type { HermesGatewayClient } from './client';
import type {
  ApprovalRespondParams,
  ClarifyRespondParams,
  PromptSubmitParams,
  SecretRespondParams,
  SessionCreateParams,
  SessionCreateResult,
  SessionHistoryResult,
  SessionResumeParams,
  SessionResumeResult,
  SudoRespondParams,
} from './types';

/**
 * Typed wrappers around TUI-gateway methods used by Hermes Bot.
 * Keep this thin — when live docs contradict a field, discard the guess.
 */

export async function sessionCreate(
  client: HermesGatewayClient,
  params: SessionCreateParams = {},
): Promise<SessionCreateResult> {
  return client.request<SessionCreateResult>('session.create', {
    cols: 80,
    source: 'hermes-bot',
    ...params,
  });
}

export async function sessionList(
  client: HermesGatewayClient,
  params: Record<string, unknown> = {},
): Promise<unknown> {
  // Debug / reconcile only — product home is the local agent roster.
  return client.request('session.list', params);
}

export async function sessionResume(
  client: HermesGatewayClient,
  params: SessionResumeParams,
): Promise<SessionResumeResult> {
  return client.request<SessionResumeResult>('session.resume', {
    cols: 80,
    ...params,
  });
}

export async function sessionHistory(
  client: HermesGatewayClient,
  sessionId: string,
): Promise<SessionHistoryResult> {
  return client.request<SessionHistoryResult>('session.history', {
    session_id: sessionId,
  });
}

/**
 * Ordinary user send. Do not pass rewind/truncate params here.
 */
export async function promptSubmit(
  client: HermesGatewayClient,
  params: PromptSubmitParams,
): Promise<unknown> {
  const { session_id, text } = params;
  return client.request('prompt.submit', { session_id, text });
}

export async function approvalRespond(
  client: HermesGatewayClient,
  params: ApprovalRespondParams,
): Promise<unknown> {
  // Payload is poorly documented — pass through extra keys for feature-detect hosts.
  return client.request('approval.respond', { ...params });
}

export async function clarifyRespond(
  client: HermesGatewayClient,
  params: ClarifyRespondParams,
): Promise<unknown> {
  return client.request('clarify.respond', { ...params });
}

export async function sudoRespond(
  client: HermesGatewayClient,
  params: SudoRespondParams,
): Promise<unknown> {
  return client.request('sudo.respond', { ...params });
}

export async function secretRespond(
  client: HermesGatewayClient,
  params: SecretRespondParams,
): Promise<unknown> {
  return client.request('secret.respond', { ...params });
}

export async function profilesList(
  client: HermesGatewayClient,
): Promise<{ profiles?: { name?: string; [key: string]: unknown }[] } | unknown> {
  try {
    return await client.request('profiles.list', {});
  } catch {
    // Optional — older gateways may not expose profiles.
    return null;
  }
}
