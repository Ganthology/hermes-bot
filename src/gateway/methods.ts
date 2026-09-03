import type { HermesGatewayClient } from './client';
import type {
  ApprovalRespondParams,
  ClarifyRespondParams,
  FileAttachParams,
  FileAttachResult,
  ImageAttachBytesParams,
  ImageAttachBytesResult,
  PdfAttachParams,
  PdfAttachResult,
  PromptSubmitParams,
  SecretRespondParams,
  SessionCreateParams,
  SessionCreateResult,
  SessionHistoryResult,
  SessionResumeParams,
  SessionResumeResult,
  SudoRespondParams,
} from './types';

/** Large byte uploads + pdf.attach page render can exceed the default RPC timeout. */
const ATTACH_TIMEOUT_MS = 180_000;

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

/**
 * Remote image upload. Canonical fields: content_base64 + filename.
 * Do not use `image.attach` with a phone filesystem path.
 */
export async function imageAttachBytes(
  client: HermesGatewayClient,
  params: ImageAttachBytesParams,
): Promise<ImageAttachBytesResult> {
  return client.request<ImageAttachBytesResult>(
    'image.attach_bytes',
    {
      session_id: params.session_id,
      content_base64: params.content_base64,
      ...(params.filename ? { filename: params.filename } : {}),
    },
    ATTACH_TIMEOUT_MS,
  );
}

/**
 * PDF → vision tiles via gateway pdftoppm. Remote path uses content_base64.
 */
export async function pdfAttach(
  client: HermesGatewayClient,
  params: PdfAttachParams,
): Promise<PdfAttachResult> {
  return client.request<PdfAttachResult>(
    'pdf.attach',
    {
      session_id: params.session_id,
      content_base64: params.content_base64,
      ...(params.filename ? { filename: params.filename } : {}),
    },
    ATTACH_TIMEOUT_MS,
  );
}

/**
 * Stage a non-image file and return `@file:` ref_text for the prompt.
 */
export async function fileAttach(
  client: HermesGatewayClient,
  params: FileAttachParams,
): Promise<FileAttachResult> {
  return client.request<FileAttachResult>(
    'file.attach',
    {
      session_id: params.session_id,
      name: params.name,
      data_url: params.data_url,
      ...(params.path ? { path: params.path } : {}),
    },
    ATTACH_TIMEOUT_MS,
  );
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
