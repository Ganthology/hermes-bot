import type { HermesGatewayClient } from '../gateway/client';
import { parseProfilesListPayload } from './map';
import type { HostProfile } from './types';

/**
 * TUI-gateway profile methods — ws twin of dashboard /api/profiles.
 * Verified against hermes-agent tui_gateway/methods_profiles.py.
 */

export async function tuiProfilesList(
  client: HermesGatewayClient,
): Promise<HostProfile[]> {
  const result = await client.request<unknown>('profiles.list', {
    include_sessions: false,
  });
  return parseProfilesListPayload(result);
}

export async function tuiProfilesCreate(
  client: HermesGatewayClient,
  params: {
    name: string;
    description?: string;
    clone_from?: string;
    soul?: string;
  },
): Promise<{ name: string }> {
  const result = await client.request<{ name?: string }>('profiles.create', {
    name: params.name,
    ...(params.description ? { description: params.description } : {}),
    ...(params.clone_from ? { clone_from: params.clone_from } : {}),
    ...(params.soul ? { soul: params.soul } : {}),
    // Headless create must be able to run a first turn (documented default).
    mirror_credentials: true,
    share_auth: true,
  });
  const name = typeof result?.name === 'string' ? result.name.trim() : params.name;
  return { name };
}

export async function tuiProfilesDescribe(
  client: HermesGatewayClient,
  name: string,
): Promise<{ description: string; soul: string }> {
  const result = await client.request<{
    description?: unknown;
    soul?: unknown;
  }>('profiles.describe', { name });
  return {
    description: typeof result?.description === 'string' ? result.description : '',
    soul: typeof result?.soul === 'string' ? result.soul : '',
  };
}

export async function tuiProfilesConfigure(
  client: HermesGatewayClient,
  params: {
    name: string;
    description?: string;
    soul?: string;
    ui_meta?: Record<string, unknown>;
  },
): Promise<{ applied?: Record<string, unknown> }> {
  return client.request('profiles.configure', params);
}

/** Soft probe — returns null when the method is missing. */
export async function tryTuiProfilesList(
  client: HermesGatewayClient,
): Promise<HostProfile[] | null> {
  try {
    return await tuiProfilesList(client);
  } catch {
    return null;
  }
}
