/**
 * Well-known product services we surface when the host has evidence.
 * Keys are normalized MCP / product ids (lowercase).
 */

export type KnownProduct = {
  id: string;
  name: string;
  enables: string;
  /** Match configured MCP server names / toolset suffixes. */
  mcpAliases: string[];
};

export const KNOWN_PRODUCTS: KnownProduct[] = [
  {
    id: 'supabase',
    name: 'Supabase',
    enables: 'Databases, auth, and project APIs via Supabase MCP',
    mcpAliases: ['supabase'],
  },
  {
    id: 'fly',
    name: 'Fly.io',
    enables: 'Deploy and manage Fly apps via MCP or fly CLI on the host',
    mcpAliases: ['fly', 'flyio', 'fly-io'],
  },
  {
    id: 'linear',
    name: 'Linear',
    enables: 'Issues and projects via Linear MCP',
    mcpAliases: ['linear'],
  },
  {
    id: 'stripe',
    name: 'Stripe',
    enables: 'Payments and billing tools via Stripe MCP',
    mcpAliases: ['stripe'],
  },
  {
    id: 'notion',
    name: 'Notion',
    enables: 'Pages and databases via Notion MCP',
    mcpAliases: ['notion'],
  },
  {
    id: 'vercel',
    name: 'Vercel',
    enables: 'Deployments and projects via Vercel MCP',
    mcpAliases: ['vercel'],
  },
  {
    id: 'cloudflare',
    name: 'Cloudflare',
    enables: 'Workers, DNS, and account tools via Cloudflare MCP',
    mcpAliases: ['cloudflare'],
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    enables: 'Repos and MRs via GitLab MCP',
    mcpAliases: ['gitlab'],
  },
  {
    id: 'atlassian',
    name: 'Atlassian',
    enables: 'Jira / Confluence via Atlassian MCP',
    mcpAliases: ['atlassian', 'jira', 'confluence'],
  },
  {
    id: 'datadog',
    name: 'Datadog',
    enables: 'Observability via Datadog MCP',
    mcpAliases: ['datadog'],
  },
  {
    id: 'github-mcp',
    name: 'GitHub (MCP)',
    enables: 'Repo tools via a configured GitHub MCP server (skills + gh are preferred)',
    mcpAliases: ['github'],
  },
];

export const GITHUB_SKILL_PRODUCT = {
  id: 'github',
  name: 'GitHub',
  enables: 'Create repos, PRs, and issues via gh CLI and github skills',
} as const;

/** Normalize MCP / toolset names for matching. */
export function normalizeServiceKey(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/^mcp[-_]/, '')
    .replace(/[_\s]+/g, '-');
}

export function matchKnownProduct(serverOrToolsetName: string): KnownProduct | null {
  const key = normalizeServiceKey(serverOrToolsetName);
  for (const product of KNOWN_PRODUCTS) {
    if (product.mcpAliases.some((alias) => alias === key || key.startsWith(`${alias}-`))) {
      return product;
    }
  }
  return null;
}
