/**
 * Load Agent info primitives from the TUI gateway.
 * Degrades per-RPC — missing methods surface as actionable errors, not invented data.
 */

import {
  mcpServersList,
  skillsInspect,
  skillsList,
  toolsShow,
} from '../gateway/methods';
import type { HermesGatewayClient } from '../gateway/client';
import { JsonRpcGatewayError } from '../gateway/client';
import type {
  McpServerSummary,
  McpStatusEntry,
  SkillInspectInfo,
  ToolsShowResult,
} from '../gateway/types';
import {
  flattenSkillsList,
  mergeMcpServers,
  toolsForMcpServer,
  type McpServerListItem,
  type McpToolListItem,
  type SkillListItem,
} from './primitives';

export type LoadSkillsOutcome = {
  items: SkillListItem[];
  error: string | null;
  unsupported: boolean;
};

export type LoadMcpOutcome = {
  servers: McpServerListItem[];
  toolsShow: ToolsShowResult | null;
  error: string | null;
  unsupported: boolean;
  /** True when mcp.servers.list failed but tools.show still returned MCP sections. */
  partial: boolean;
};

function rpcUnavailableMessage(error: unknown, method: string): {
  message: string;
  unsupported: boolean;
} {
  if (error instanceof JsonRpcGatewayError) {
    const code = error.code;
    const text = error.message || `${method} failed`;
    const unsupported =
      code === -32601 ||
      /method not found|unknown method|not (found|supported)|404/i.test(text);
    return {
      message: unsupported
        ? `This host does not expose ${method}. Update Hermes dashboard / serve, or browse from Desktop.`
        : text,
      unsupported,
    };
  }
  if (error instanceof Error) {
    return { message: error.message, unsupported: false };
  }
  return { message: `${method} failed`, unsupported: false };
}

export async function loadAgentSkills(
  client: HermesGatewayClient,
  options: { profile?: string | null } = {},
): Promise<LoadSkillsOutcome> {
  try {
    const result = await skillsList(client, {
      ...(options.profile ? { profile: options.profile } : {}),
    });
    return {
      items: flattenSkillsList(result),
      error: null,
      unsupported: false,
    };
  } catch (error) {
    const { message, unsupported } = rpcUnavailableMessage(error, 'skills.manage');
    return { items: [], error: message, unsupported };
  }
}

export async function loadSkillDetail(
  client: HermesGatewayClient,
  skillName: string,
  options: { profile?: string | null } = {},
): Promise<{ info: SkillInspectInfo | null; error: string | null; unsupported: boolean }> {
  try {
    const result = await skillsInspect(client, skillName, {
      ...(options.profile ? { profile: options.profile } : {}),
    });
    const info = result.info && typeof result.info === 'object' ? result.info : null;
    if (!info || (!info.name && !info.description && !info.skill_md_preview)) {
      return {
        info: info ?? { name: skillName },
        error: null,
        unsupported: false,
      };
    }
    return { info, error: null, unsupported: false };
  } catch (error) {
    const { message, unsupported } = rpcUnavailableMessage(error, 'skills.manage inspect');
    return { info: null, error: message, unsupported };
  }
}

/**
 * Prefer mcp.servers.list for configured servers; merge live status when
 * session.info (or a similar payload) provided mcp_servers. tools.show supplies tool bodies.
 */
export async function loadAgentMcp(
  client: HermesGatewayClient,
  options: {
    profile?: string | null;
    sessionId?: string | null;
    mcpStatus?: McpStatusEntry[] | null;
  } = {},
): Promise<LoadMcpOutcome> {
  let configured: McpServerSummary[] | null = null;
  let listError: string | null = null;
  let listUnsupported = false;

  try {
    const listed = await mcpServersList(client, {
      ...(options.profile ? { profile: options.profile } : {}),
    });
    configured = Array.isArray(listed.servers) ? listed.servers : [];
  } catch (error) {
    const { message, unsupported } = rpcUnavailableMessage(error, 'mcp.servers.list');
    listError = message;
    listUnsupported = unsupported;
  }

  let show: ToolsShowResult | null = null;
  let showError: string | null = null;
  let showUnsupported = false;

  try {
    show = await toolsShow(client, {
      ...(options.sessionId ? { session_id: options.sessionId } : {}),
    });
  } catch (error) {
    const { message, unsupported } = rpcUnavailableMessage(error, 'tools.show');
    showError = message;
    showUnsupported = unsupported;
  }

  const status = options.mcpStatus ?? null;
  let servers = mergeMcpServers(configured, status);

  // If list failed but tools.show has mcp-* sections, synthesize server rows.
  if (servers.length === 0 && show?.sections) {
    const fromTools = new Set<string>();
    for (const section of show.sections) {
      const name = typeof section.name === 'string' ? section.name : '';
      if (name.startsWith('mcp-')) {
        fromTools.add(name.slice('mcp-'.length));
      }
    }
    if (fromTools.size > 0) {
      servers = mergeMcpServers(
        [...fromTools].map((name) => ({ name, enabled: true, transport: 'unknown' })),
        status,
      );
    }
  }

  // Enrich tool counts from tools.show when live status lacks them.
  if (show) {
    servers = servers.map((server) => {
      if (server.toolCount !== null) {
        return server;
      }
      const tools = toolsForMcpServer(show, server.name);
      return { ...server, toolCount: tools.length };
    });
  }

  const unsupported = listUnsupported && showUnsupported;
  const error =
    servers.length === 0
      ? listError || showError
      : listError && showError
        ? `${listError} Also: ${showError}`
        : null;

  return {
    servers,
    toolsShow: show,
    error,
    unsupported,
    partial: Boolean(listError && show && servers.length > 0),
  };
}

export function toolsForServerFromCache(
  toolsShowResult: ToolsShowResult | null,
  server: string,
): McpToolListItem[] {
  return toolsForMcpServer(toolsShowResult, server);
}
