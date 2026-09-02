/**
 * Product-level connected services (not a skills/MCP primitive browser).
 * Status is inferred from documented TUI RPCs only — never invent auth probes.
 */

export type ServiceStatus = 'connected' | 'not_connected' | 'unknown';

export type WiringKind = 'skill' | 'mcp' | 'cli';

export type ConnectedServiceEvidence = {
  skillNames: string[];
  mcpServerName: string | null;
  mcpToolsetName: string | null;
  catalogInstalled: boolean | null;
  catalogEnabled: boolean | null;
  mcpEnabled: boolean | null;
  /** Presence flag from mcp.servers.list — never a token value. */
  oauthTokensPresent: boolean | null;
  /** Human note when CLI auth cannot be verified from the protocol. */
  cliAuthNote: string | null;
};

export type ConnectedService = {
  id: string;
  name: string;
  status: ServiceStatus;
  /** Short “what this enables”. */
  enables: string;
  wiring: WiringKind[];
  evidence: ConnectedServiceEvidence;
};

export type ConnectedServicesSnapshot = {
  scopeLabel: string;
  profileName: string | null;
  services: ConnectedService[];
  /** Raw RPC availability for debugging empty states — no secrets. */
  sources: {
    skills: boolean;
    toolsets: boolean;
    mcpCatalog: boolean;
    mcpServers: boolean;
  };
};
