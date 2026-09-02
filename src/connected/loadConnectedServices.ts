import type { HermesGatewayClient } from '../gateway/client';
import {
  mcpCatalog,
  mcpServersList,
  skillsManageList,
  toolsetsList,
  toolsList,
} from '../gateway/methods';
import { inferConnectedServices } from './inferConnectedServices';
import type { ConnectedServicesSnapshot } from './types';

export async function loadConnectedServices(
  client: HermesGatewayClient,
  options: { profileName?: string | null } = {},
): Promise<ConnectedServicesSnapshot> {
  const profile = options.profileName?.trim() || undefined;
  const profileOpts = profile ? { profile } : {};

  const [skills, toolsetsPrimary, toolsFallback, catalog, servers] = await Promise.all([
    skillsManageList(client, profileOpts),
    toolsetsList(client),
    toolsList(client),
    mcpCatalog(client, profileOpts),
    mcpServersList(client, profileOpts),
  ]);

  const toolsets =
    toolsetsPrimary?.toolsets ??
    toolsFallback?.toolsets ??
    null;

  const skillsByCategory =
    skills?.skills && typeof skills.skills === 'object' ? skills.skills : null;

  const services = inferConnectedServices({
    skillsByCategory,
    toolsets,
    mcpCatalog: catalog?.servers ?? null,
    mcpServers: servers?.servers ?? null,
  });

  const scopeLabel = profile
    ? `Host profile: ${profile}`
    : 'Shared host / launch profile';

  return {
    scopeLabel,
    profileName: profile ?? null,
    services,
    sources: {
      skills: skillsByCategory != null,
      toolsets: toolsets != null,
      mcpCatalog: catalog?.servers != null,
      mcpServers: servers?.servers != null,
    },
  };
}
