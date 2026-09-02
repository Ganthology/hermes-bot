import type { HermesGatewayClient } from './client';
import type {
  ApprovalRespondParams,
  ClarifyRespondParams,
  FileAttachParams,
  FileAttachResult,
  ImageAttachBytesParams,
  ImageAttachBytesResult,
  McpCatalogResult,
  McpServersListResult,
  PdfAttachParams,
  PdfAttachResult,
  PromptSubmitParams,
  SecretRespondParams,
  SessionCreateParams,
  SessionCreateResult,
  SessionHistoryResult,
  SessionResumeParams,
  SessionResumeResult,
  SkillsInspectResult,
  SkillsListResult,
  SudoRespondParams,
  ToolsListResult,
  ToolsShowResult,
  ToolsetsListResult,
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

/**
 * skills.manage — list / inspect / browse / search.
 * Optional `profile` scopes HERMES_HOME on hosts that support it.
 */
export async function skillsManage(
  client: HermesGatewayClient,
  params: {
    action: 'list' | 'inspect' | 'browse' | 'search';
    query?: string;
    profile?: string;
    page?: number;
    page_size?: number;
  },
): Promise<SkillsListResult & SkillsInspectResult & Record<string, unknown>> {
  const { action, query, profile, page, page_size } = params;
  return client.request('skills.manage', {
    action,
    ...(query !== undefined ? { query } : {}),
    ...(profile ? { profile } : {}),
    ...(page !== undefined ? { page } : {}),
    ...(page_size !== undefined ? { page_size } : {}),
  });
}

export async function skillsList(
  client: HermesGatewayClient,
  options: { profile?: string } = {},
): Promise<SkillsListResult> {
  return skillsManage(client, { action: 'list', ...options }) as Promise<SkillsListResult>;
}

export async function skillsInspect(
  client: HermesGatewayClient,
  query: string,
  options: { profile?: string } = {},
): Promise<SkillsInspectResult> {
  return skillsManage(client, {
    action: 'inspect',
    query,
    ...options,
  }) as Promise<SkillsInspectResult>;
}

/** tools.show — discovery surface with short per-tool descriptions, grouped by toolset. */
export async function toolsShow(
  client: HermesGatewayClient,
  params: { session_id?: string } = {},
): Promise<ToolsShowResult> {
  return client.request<ToolsShowResult>('tools.show', { ...params });
}

export async function toolsList(
  client: HermesGatewayClient,
  params: { session_id?: string; sessionId?: string } = {},
): Promise<ToolsListResult | null> {
  try {
    return await client.request<ToolsListResult>('tools.list', {
      ...(params.session_id ?? params.sessionId
        ? { session_id: params.session_id ?? params.sessionId }
        : {}),
    });
  } catch {
    return null;
  }
}

export async function toolsetsList(
  client: HermesGatewayClient,
  params: { session_id?: string; sessionId?: string } = {},
): Promise<ToolsetsListResult | null> {
  try {
    return await client.request<ToolsetsListResult>('toolsets.list', {
      ...(params.session_id ?? params.sessionId
        ? { session_id: params.session_id ?? params.sessionId }
        : {}),
    });
  } catch {
    return null;
  }
}

/**
 * mcp.servers.list — configured MCP servers (optional profile).
 * Read-only browse for Hermes Bot; do not call add/remove/test from the phone.
 */
export async function mcpServersList(
  client: HermesGatewayClient,
  options: { profile?: string } = {},
): Promise<McpServersListResult> {
  return client.request<McpServersListResult>('mcp.servers.list', {
    ...(options.profile ? { profile: options.profile } : {}),
  });
}

/** Soft-fail list for connected-services inference. */
export async function skillsManageList(
  client: HermesGatewayClient,
  options: { profile?: string } = {},
): Promise<SkillsListResult | null> {
  try {
    return await skillsList(client, options);
  } catch {
    return null;
  }
}

export async function mcpCatalog(
  client: HermesGatewayClient,
  options: { profile?: string } = {},
): Promise<McpCatalogResult | null> {
  try {
    return await client.request<McpCatalogResult>('mcp.catalog', {
      ...(options.profile ? { profile: options.profile } : {}),
    });
  } catch {
    return null;
  }
}

export async function mcpServersListSoft(
  client: HermesGatewayClient,
  options: { profile?: string } = {},
): Promise<McpServersListResult | null> {
  try {
    return await mcpServersList(client, options);
  } catch {
    return null;
  }
}
