/**
 * Pure helpers for Agent info primitives (skills + MCP).
 * Normalizes documented TUI-gateway shapes — no invented endpoints.
 */

import type {
  McpServerSummary,
  McpStatusEntry,
  SkillInspectInfo,
  SkillsListResult,
  ToolsShowResult,
} from '../gateway/types';

export type SkillListItem = {
  name: string;
  category: string;
};

export type McpServerListItem = {
  name: string;
  transport: string;
  enabled: boolean;
  /** Live status from session.info mcp_servers when available. */
  status: string | null;
  connected: boolean | null;
  error: string | null;
  /** Tool count from live status, else unknown. */
  toolCount: number | null;
};

export type McpToolListItem = {
  name: string;
  shortName: string;
  description: string;
  server: string;
};

export function flattenSkillsList(result: SkillsListResult | null | undefined): SkillListItem[] {
  const skills = result?.skills;
  if (!skills || typeof skills !== 'object') {
    return [];
  }

  const items: SkillListItem[] = [];
  for (const [category, names] of Object.entries(skills)) {
    if (!Array.isArray(names)) {
      continue;
    }
    for (const raw of names) {
      if (typeof raw !== 'string' || !raw.trim()) {
        continue;
      }
      items.push({ name: raw.trim(), category: category || 'general' });
    }
  }

  items.sort((a, b) => {
    const cat = a.category.localeCompare(b.category);
    if (cat !== 0) {
      return cat;
    }
    return a.name.localeCompare(b.name);
  });
  return items;
}

export function filterSkills(items: SkillListItem[], query: string): SkillListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) || item.category.toLowerCase().includes(q),
  );
}

export function skillInspectTitle(info: SkillInspectInfo | null | undefined, fallback: string): string {
  const name = typeof info?.name === 'string' ? info.name.trim() : '';
  return name || fallback;
}

export function skillInspectDescription(info: SkillInspectInfo | null | undefined): string | null {
  const description = typeof info?.description === 'string' ? info.description.trim() : '';
  return description || null;
}

export function skillInspectBody(info: SkillInspectInfo | null | undefined): string | null {
  const preview =
    typeof info?.skill_md_preview === 'string' ? info.skill_md_preview.trim() : '';
  return preview || null;
}

export function mcpToolsetName(server: string): string {
  return `mcp-${server}`;
}

export function mcpToolPrefix(server: string): string {
  return `mcp_${server}_`;
}

/**
 * Match tools.show sections / tool names to an MCP server.
 * Runtime toolset is `mcp-<name>`; registered tools are `mcp_<server>_<tool>`.
 */
export function isMcpSectionForServer(sectionName: string, server: string): boolean {
  const normalized = sectionName.trim().toLowerCase();
  const target = mcpToolsetName(server).toLowerCase();
  if (normalized === target) {
    return true;
  }
  // Some hosts may omit the mcp- prefix in section labels.
  return normalized === server.trim().toLowerCase();
}

export function shortMcpToolName(toolName: string, server: string): string {
  const prefix = mcpToolPrefix(server);
  if (toolName.startsWith(prefix)) {
    return toolName.slice(prefix.length) || toolName;
  }
  const generic = toolName.match(/^mcp_[^_]+_(.+)$/);
  if (generic?.[1]) {
    return generic[1];
  }
  return toolName;
}

export function toolsForMcpServer(
  result: ToolsShowResult | null | undefined,
  server: string,
): McpToolListItem[] {
  const sections = result?.sections;
  if (!Array.isArray(sections)) {
    return [];
  }

  const matched: McpToolListItem[] = [];
  const prefix = mcpToolPrefix(server);

  for (const section of sections) {
    const sectionName = typeof section?.name === 'string' ? section.name : '';
    const tools = Array.isArray(section?.tools) ? section.tools : [];
    const sectionMatches = sectionName ? isMcpSectionForServer(sectionName, server) : false;

    for (const tool of tools) {
      const name = typeof tool?.name === 'string' ? tool.name.trim() : '';
      if (!name) {
        continue;
      }
      const nameMatches = name.startsWith(prefix) || name.startsWith(`mcp_${server}_`);
      if (!sectionMatches && !nameMatches) {
        continue;
      }
      const description =
        typeof tool?.description === 'string' ? tool.description.trim() : '';
      matched.push({
        name,
        shortName: shortMcpToolName(name, server),
        description,
        server,
      });
    }
  }

  // Deduplicate by full tool name (section + prefix paths can overlap).
  const byName = new Map<string, McpToolListItem>();
  for (const item of matched) {
    byName.set(item.name, item);
  }
  return [...byName.values()].sort((a, b) => a.shortName.localeCompare(b.shortName));
}

export function filterMcpTools(items: McpToolListItem[], query: string): McpToolListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter(
    (item) =>
      item.shortName.toLowerCase().includes(q) ||
      item.name.toLowerCase().includes(q) ||
      item.description.toLowerCase().includes(q),
  );
}

export function mergeMcpServers(
  configured: McpServerSummary[] | null | undefined,
  status: McpStatusEntry[] | null | undefined,
): McpServerListItem[] {
  const statusByName = new Map<string, McpStatusEntry>();
  if (Array.isArray(status)) {
    for (const entry of status) {
      if (typeof entry?.name === 'string' && entry.name.trim()) {
        statusByName.set(entry.name.trim(), entry);
      }
    }
  }

  const names = new Set<string>();
  if (Array.isArray(configured)) {
    for (const server of configured) {
      if (typeof server?.name === 'string' && server.name.trim()) {
        names.add(server.name.trim());
      }
    }
  }
  for (const name of statusByName.keys()) {
    names.add(name);
  }

  const items: McpServerListItem[] = [];
  for (const name of [...names].sort((a, b) => a.localeCompare(b))) {
    const cfg = Array.isArray(configured)
      ? configured.find((s) => s.name === name)
      : undefined;
    const live = statusByName.get(name);
    const enabled =
      cfg?.enabled !== false && live?.disabled !== true && live?.status !== 'disabled';
    const toolCount =
      typeof live?.tools === 'number'
        ? live.tools
        : null;

    items.push({
      name,
      transport:
        (typeof live?.transport === 'string' && live.transport) ||
        (typeof cfg?.transport === 'string' && cfg.transport) ||
        'unknown',
      enabled,
      status: typeof live?.status === 'string' ? live.status : null,
      connected: typeof live?.connected === 'boolean' ? live.connected : null,
      error: typeof live?.error === 'string' ? live.error : null,
      toolCount,
    });
  }
  return items;
}

export function filterMcpServers(
  items: McpServerListItem[],
  query: string,
): McpServerListItem[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return items;
  }
  return items.filter(
    (item) =>
      item.name.toLowerCase().includes(q) ||
      item.transport.toLowerCase().includes(q) ||
      (item.status?.toLowerCase().includes(q) ?? false),
  );
}

export function mcpStatusLabel(item: McpServerListItem): string {
  if (!item.enabled) {
    return 'Disabled';
  }
  if (item.status) {
    switch (item.status) {
      case 'connected':
        return 'Connected';
      case 'connecting':
        return 'Connecting…';
      case 'failed':
        return item.error ? `Failed — ${item.error}` : 'Failed';
      case 'configured':
        return 'Configured';
      case 'disabled':
        return 'Disabled';
      default:
        return item.status;
    }
  }
  if (item.connected === true) {
    return 'Connected';
  }
  if (item.connected === false) {
    return 'Not connected';
  }
  return 'From this host';
}
