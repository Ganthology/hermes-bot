/**
 * TUI gateway event + RPC types.
 *
 * Field names for ordinary prompt.submit / session.create / approval.respond
 * are only partially documented. Prefer shapes observed in hermes-agent
 * (tui_gateway + apps/shared JsonRpcGatewayClient). Mark guesses clearly.
 */

export type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

export type GatewayEventName =
  | 'gateway.ready'
  | 'session.info'
  | 'message.start'
  | 'message.delta'
  | 'message.complete'
  | 'thinking.delta'
  | 'reasoning.delta'
  | 'reasoning.available'
  | 'status.update'
  | 'tool.start'
  | 'tool.progress'
  | 'tool.generating'
  | 'tool.complete'
  | 'approval.request'
  | 'clarify.request'
  | 'sudo.request'
  | 'secret.request'
  | 'sudo.expire'
  | 'secret.expire'
  | 'error'
  | (string & {});

export type GatewayEvent<P = Record<string, unknown>> = {
  type: GatewayEventName;
  session_id?: string;
  payload?: P;
  /** Present on newer gateways for reconnect replay. */
  seq?: number;
};

export type JsonRpcErrorPayload = {
  code?: number;
  message?: string;
  data?: unknown;
};

export type JsonRpcFrame = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: GatewayEvent | Record<string, unknown>;
  result?: unknown;
  error?: JsonRpcErrorPayload;
};

/** Undocumented create fields — taken from Desktop / tui_gateway handlers. */
export type SessionCreateParams = {
  /** Display title for the durable chat. */
  title?: string;
  /** Optional Hermes profile name when the gateway hosts multiple. */
  profile?: string;
  cols?: number;
  /** Client attribution; Desktop sends "desktop". */
  source?: string;
  model?: string;
  provider?: string;
};

export type SessionCreateResult = {
  session_id: string;
  /** Durable id in Hermes SQLite — pin this on the phone. */
  stored_session_id?: string;
  message_count?: number;
  messages?: GatewayHistoryMessage[];
};

export type SessionResumeParams = {
  session_id: string;
  profile?: string;
  cols?: number;
  omit_messages?: boolean;
  defer_history?: boolean;
};

export type SessionResumeResult = {
  session_id: string;
  stored_session_id?: string;
  resumed?: string;
  message_count?: number;
  messages?: GatewayHistoryMessage[];
  hydrating?: boolean;
  messages_omitted?: boolean;
};

export type SessionHistoryResult = {
  count?: number;
  messages?: GatewayHistoryMessage[];
};

export type GatewayHistoryMessage = {
  role?: string;
  content?: unknown;
  text?: unknown;
  row_id?: number | string;
  _row_id?: number | string;
  display_kind?: string;
  [key: string]: unknown;
};

/**
 * Ordinary send. NEVER include truncate_before_* or confirm_truncate —
 * those are rewind-only and refused / destructive without confirm flags.
 */
export type PromptSubmitParams = {
  session_id: string;
  /** Observed primary text field in gatewayClient examples + server handler. */
  text: string;
};

/** Remote image upload — `image.attach_bytes` (never phone-local `image.attach`). */
export type ImageAttachBytesParams = {
  session_id: string;
  content_base64: string;
  filename?: string;
};

export type ImageAttachBytesResult = {
  attached?: boolean;
  path?: string;
  count?: number;
  text?: string;
  message?: string;
  bytes?: number;
  [key: string]: unknown;
};

/** PDF vision-tile path — `pdf.attach` with base64 for remote clients. */
export type PdfAttachParams = {
  session_id: string;
  content_base64: string;
  filename?: string;
};

export type PdfAttachResult = {
  attached?: boolean;
  filename?: string;
  pages_attached?: number;
  count?: number;
  text?: string;
  message?: string;
  [key: string]: unknown;
};

/**
 * Non-image staging — `file.attach`. Remote clients must send `data_url`
 * (base64 data URL). Response `ref_text` goes into the submitted prompt.
 */
export type FileAttachParams = {
  session_id: string;
  name: string;
  data_url: string;
  /** Optional client-side label; gateway uses it for naming when present. */
  path?: string;
};

export type FileAttachResult = {
  attached?: boolean;
  name?: string;
  path?: string;
  ref_path?: string;
  ref_text?: string;
  uploaded?: boolean;
  message?: string;
  [key: string]: unknown;
};

export type ApprovalRespondParams = {
  session_id?: string;
  request_id?: string;
  /** Server default is "deny". Observed choices include allow / deny. */
  choice?: string;
  all?: boolean;
  [key: string]: unknown;
};

export type ClarifyRespondParams = {
  session_id?: string;
  request_id: string;
  /** _respond key for clarify is "answer". */
  answer?: string;
  question_id?: string;
  [key: string]: unknown;
};

export type SudoRespondParams = {
  session_id?: string;
  request_id: string;
  password?: string;
  [key: string]: unknown;
};

export type SecretRespondParams = {
  session_id?: string;
  request_id: string;
  value?: string;
  [key: string]: unknown;
};

export type InteractiveKind = 'approval' | 'clarify' | 'sudo' | 'secret';

export type InteractiveRequest = {
  id: string;
  kind: InteractiveKind;
  sessionId?: string;
  requestId: string;
  /** Raw gateway payload — feature-detect fields; do not invent a second protocol. */
  payload: Record<string, unknown>;
  createdAt: number;
};

/** skills.manage action list — category → skill names (hermes_cli.banner.get_available_skills). */
export type SkillsListResult = {
  skills?: Record<string, string[]>;
};

/** skills.manage action inspect — hub/local metadata when the host can resolve it. */
export type SkillInspectInfo = {
  name?: string;
  description?: string;
  source?: string;
  identifier?: string;
  tags?: string[];
  category?: string;
  path?: string;
  skill_md_preview?: string;
  [key: string]: unknown;
};

export type SkillsInspectResult = {
  info?: SkillInspectInfo;
};

export type ToolsShowTool = {
  name?: string;
  description?: string;
};

export type ToolsShowSection = {
  name?: string;
  tools?: ToolsShowTool[];
};

/** tools.show — tools grouped by toolset (MCP servers appear as mcp-<name>). */
export type ToolsShowResult = {
  sections?: ToolsShowSection[];
  total?: number;
};

export type ToolsetListItem = {
  name?: string;
  description?: string;
  tool_count?: number;
  enabled?: boolean;
  tools?: string[];
};

export type ToolsListResult = {
  toolsets?: ToolsetListItem[];
};

export type ToolsetsListResult = {
  toolsets?: ToolsetListItem[];
};

/**
 * mcp.servers.list — configured servers for a profile (optional profile param).
 * `tools` here is the config allowlist, not the live discovered tool list.
 */
export type McpServerSummary = {
  name?: string;
  transport?: string;
  url?: string | null;
  command?: string | null;
  args?: string[];
  env?: string[];
  auth?: unknown;
  oauth_tokens_present?: boolean | null;
  enabled?: boolean;
  tools?: unknown;
  [key: string]: unknown;
};

export type McpServersListResult = {
  servers?: McpServerSummary[];
};

/** Shape observed on session.info via get_mcp_status (not a standalone RPC). */
export type McpStatusEntry = {
  name?: string;
  transport?: string;
  tools?: number;
  connected?: boolean;
  disabled?: boolean;
  status?: string;
  error?: string;
  [key: string]: unknown;
};
