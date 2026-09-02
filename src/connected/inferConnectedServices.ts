import type {
  McpCatalogServer,
  McpConfiguredServer,
  ToolsetListItem,
} from '../gateway/types';
import {
  GITHUB_SKILL_PRODUCT,
  matchKnownProduct,
  normalizeServiceKey,
  type KnownProduct,
} from './knownProducts';
import type {
  ConnectedService,
  ConnectedServiceEvidence,
  ServiceStatus,
  WiringKind,
} from './types';

export type InferConnectedServicesInput = {
  /** Category → skill names from skills.manage action=list. */
  skillsByCategory: Record<string, string[]> | null;
  toolsets: ToolsetListItem[] | null;
  mcpCatalog: McpCatalogServer[] | null;
  mcpServers: McpConfiguredServer[] | null;
};

function emptyEvidence(): ConnectedServiceEvidence {
  return {
    skillNames: [],
    mcpServerName: null,
    mcpToolsetName: null,
    catalogInstalled: null,
    catalogEnabled: null,
    mcpEnabled: null,
    oauthTokensPresent: null,
    cliAuthNote: null,
  };
}

function flattenSkills(skillsByCategory: Record<string, string[]>): {
  names: string[];
  githubSkills: string[];
} {
  const names: string[] = [];
  const githubSkills: string[] = [];

  for (const [category, list] of Object.entries(skillsByCategory)) {
    const cat = category.toLowerCase();
    for (const raw of list) {
      if (typeof raw !== 'string' || !raw.trim()) {
        continue;
      }
      const name = raw.trim();
      names.push(name);
      const lower = name.toLowerCase();
      const isGithub =
        cat === 'github' ||
        cat.startsWith('github/') ||
        lower === 'github' ||
        lower === 'github-auth' ||
        lower.startsWith('github-') ||
        lower.startsWith('github/');
      if (isGithub) {
        githubSkills.push(name);
      }
    }
  }

  return { names, githubSkills };
}

function findMcpToolset(
  toolsets: ToolsetListItem[] | null,
  serverName: string,
): ToolsetListItem | null {
  if (!toolsets) {
    return null;
  }
  const want = `mcp-${normalizeServiceKey(serverName)}`;
  const wantRaw = `mcp-${serverName.toLowerCase()}`;
  for (const ts of toolsets) {
    const n = ts.name.toLowerCase();
    if (n === want || n === wantRaw || normalizeServiceKey(ts.name) === normalizeServiceKey(serverName)) {
      return ts;
    }
  }
  return null;
}

function statusForMcp(args: {
  configured: McpConfiguredServer | null;
  catalog: McpCatalogServer | null;
  toolset: ToolsetListItem | null;
}): ServiceStatus {
  const enabledConfigured =
    args.configured != null
      ? args.configured.enabled !== false
      : args.catalog?.enabled === true;

  if (!enabledConfigured && args.configured == null && args.catalog?.installed !== true) {
    return 'not_connected';
  }

  if (args.configured != null && args.configured.enabled === false) {
    return 'not_connected';
  }

  if (args.catalog?.installed === true && args.catalog.enabled === false && !args.configured) {
    return 'not_connected';
  }

  const auth = args.configured?.auth;
  if (auth === 'oauth') {
    if (args.configured?.oauth_tokens_present === true) {
      return 'connected';
    }
    if (args.configured?.oauth_tokens_present === false) {
      return 'unknown';
    }
    return 'unknown';
  }

  if (enabledConfigured || args.toolset?.enabled === true || args.catalog?.enabled === true) {
    return 'connected';
  }

  if (args.configured != null || args.catalog?.installed === true) {
    return 'unknown';
  }

  return 'not_connected';
}

function buildGithubFromSkills(githubSkills: string[]): ConnectedService {
  const wiring: WiringKind[] = ['skill', 'cli'];
  const evidence = emptyEvidence();
  evidence.skillNames = [...githubSkills].sort();
  evidence.cliAuthNote =
    'gh CLI login is not exposed over the TUI gateway — status is inferred from github skills only.';

  return {
    id: GITHUB_SKILL_PRODUCT.id,
    name: GITHUB_SKILL_PRODUCT.name,
    status: 'connected',
    enables: GITHUB_SKILL_PRODUCT.enables,
    wiring,
    evidence,
  };
}

function buildFromMcp(args: {
  product: KnownProduct;
  configured: McpConfiguredServer | null;
  catalog: McpCatalogServer | null;
  toolset: ToolsetListItem | null;
}): ConnectedService | null {
  const hasPresence =
    args.configured != null ||
    args.catalog?.installed === true ||
    args.catalog?.enabled === true ||
    (args.toolset != null && args.toolset.enabled !== false);

  if (!hasPresence) {
    return null;
  }

  // Prefer the skills+gh GitHub row; only show GitHub (MCP) when an MCP server is actually configured.
  if (args.product.id === 'github-mcp' && args.configured == null && args.catalog?.installed !== true) {
    return null;
  }

  const evidence = emptyEvidence();
  evidence.mcpServerName = args.configured?.name ?? args.catalog?.name ?? null;
  evidence.mcpToolsetName = args.toolset?.name ?? null;
  evidence.catalogInstalled =
    args.catalog != null ? Boolean(args.catalog.installed) : null;
  evidence.catalogEnabled = args.catalog != null ? Boolean(args.catalog.enabled) : null;
  evidence.mcpEnabled =
    args.configured != null
      ? args.configured.enabled !== false
      : args.catalog != null
        ? Boolean(args.catalog.enabled)
        : args.toolset != null
          ? Boolean(args.toolset.enabled)
          : null;
  evidence.oauthTokensPresent =
    typeof args.configured?.oauth_tokens_present === 'boolean'
      ? args.configured.oauth_tokens_present
      : null;

  const wiring: WiringKind[] = ['mcp'];
  if (args.product.id === 'fly') {
    wiring.push('cli');
    evidence.cliAuthNote =
      'fly CLI auth is not exposed over the TUI gateway — showing MCP wiring only when present.';
  }

  return {
    id: args.product.id,
    name: args.product.name,
    status: statusForMcp({
      configured: args.configured,
      catalog: args.catalog,
      toolset: args.toolset,
    }),
    enables: args.product.enables,
    wiring,
    evidence,
  };
}

/**
 * Infer product-level connected services from live host snapshots.
 * Only returns services with host evidence — never a fake “connected” row.
 */
export function inferConnectedServices(input: InferConnectedServicesInput): ConnectedService[] {
  const byId = new Map<string, ConnectedService>();

  const skillFlat = input.skillsByCategory
    ? flattenSkills(input.skillsByCategory)
    : { names: [], githubSkills: [] };

  if (skillFlat.githubSkills.length > 0) {
    byId.set(GITHUB_SKILL_PRODUCT.id, buildGithubFromSkills(skillFlat.githubSkills));
  }

  const catalogByName = new Map<string, McpCatalogServer>();
  for (const entry of input.mcpCatalog ?? []) {
    if (entry?.name) {
      catalogByName.set(normalizeServiceKey(entry.name), entry);
    }
  }

  const configured = input.mcpServers ?? [];
  const seenProductIds = new Set<string>();

  for (const server of configured) {
    if (!server?.name) {
      continue;
    }
    const product = matchKnownProduct(server.name);
    if (!product) {
      continue;
    }
    // If skills already cover GitHub, skip a duplicate MCP github row unless MCP is distinctly configured.
    if (product.id === 'github-mcp' && byId.has(GITHUB_SKILL_PRODUCT.id)) {
      // Still show MCP evidence as a separate row only when a github MCP server is configured.
    }
    const toolset = findMcpToolset(input.toolsets, server.name);
    const catalog = catalogByName.get(normalizeServiceKey(server.name)) ?? null;
    const row = buildFromMcp({ product, configured: server, catalog, toolset });
    if (row) {
      byId.set(row.id, row);
      seenProductIds.add(row.id);
    }
  }

  // Catalog installed/enabled entries that map to known products but were missing from servers.list
  // (older hosts may only expose mcp.catalog).
  for (const [key, entry] of catalogByName) {
    if (!entry.installed && !entry.enabled) {
      continue;
    }
    const product = matchKnownProduct(key);
    if (!product || seenProductIds.has(product.id)) {
      continue;
    }
    if (product.id === 'github-mcp' && byId.has(GITHUB_SKILL_PRODUCT.id) && !entry.installed) {
      continue;
    }
    const toolset = findMcpToolset(input.toolsets, entry.name);
    const row = buildFromMcp({
      product,
      configured: null,
      catalog: entry,
      toolset,
    });
    if (row) {
      byId.set(row.id, row);
    }
  }

  // Enabled mcp-* toolsets for known products when servers/catalog RPCs are absent.
  if ((!input.mcpServers || input.mcpServers.length === 0) && input.toolsets) {
    for (const ts of input.toolsets) {
      if (!ts.name.toLowerCase().startsWith('mcp-')) {
        continue;
      }
      if (ts.enabled === false) {
        continue;
      }
      const product = matchKnownProduct(ts.name);
      if (!product || byId.has(product.id)) {
        continue;
      }
      if (product.id === 'github-mcp' && byId.has(GITHUB_SKILL_PRODUCT.id)) {
        continue;
      }
      const row = buildFromMcp({
        product,
        configured: null,
        catalog: catalogByName.get(normalizeServiceKey(ts.name)) ?? null,
        toolset: ts,
      });
      if (row) {
        byId.set(row.id, row);
      }
    }
  }

  return [...byId.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function statusLabel(status: ServiceStatus): string {
  switch (status) {
    case 'connected':
      return 'Connected';
    case 'not_connected':
      return 'Not connected';
    case 'unknown':
      return 'Unknown';
    default: {
      const _exhaustive: never = status;
      return _exhaustive;
    }
  }
}

export function wiringLabel(wiring: WiringKind[]): string {
  return wiring
    .map((kind) => {
      switch (kind) {
        case 'skill':
          return 'skill';
        case 'mcp':
          return 'MCP';
        case 'cli':
          return 'CLI';
        default: {
          const _exhaustive: never = kind;
          return _exhaustive;
        }
      }
    })
    .join(' · ');
}
