import type { HermesGatewayClient } from '../gateway/client';
import type { ConnectionCredentials } from '../storage/credentials';
import { hostIdFromName, mapProfileToFields } from './map';
import { createRestProfilesClient, probeRestProfiles, type RestProfilesClient } from './rest';
import {
  tryTuiProfilesList,
  tuiProfilesConfigure,
  tuiProfilesCreate,
  tuiProfilesDescribe,
} from './tui';
import type {
  CreateHostAgentInput,
  HostAgentFields,
  HostProfile,
  ProfilesCapabilities,
  SaveHostAgentInput,
} from './types';
import { ProfilesReadOnlyError, ProfilesUnavailableError } from './types';

export type ProfilesService = {
  capabilities: ProfilesCapabilities;
  list: () => Promise<HostProfile[]>;
  loadEditor: (id: string) => Promise<HostAgentFields>;
  create: (input: CreateHostAgentInput) => Promise<{ id: string }>;
  save: (input: SaveHostAgentInput) => Promise<HostAgentFields>;
  remove: (id: string) => Promise<void>;
};

type Backend = {
  rest: RestProfilesClient | null;
  gateway: HermesGatewayClient | null;
  listMode: 'rest' | 'tui';
};

function buildCapabilities(backend: Backend): ProfilesCapabilities {
  const hasRest = backend.rest != null;
  const hasTui = backend.gateway != null;
  return {
    transport: backend.listMode,
    canList: true,
    canCreate: hasRest || hasTui,
    canReadSoul: hasRest || hasTui,
    canWriteDescription: hasRest || hasTui,
    canWriteSoul: hasRest || hasTui,
    canRename: hasRest,
    canDelete: hasRest,
    canConfigure: hasTui,
    canWriteAppearance: hasRest || hasTui,
  };
}

function findProfile(profiles: HostProfile[], id: string): HostProfile {
  const found = profiles.find((p) => p.name === id);
  if (!found) {
    throw new Error('That agent is no longer on this host.');
  }
  return found;
}

async function listProfiles(backend: Backend): Promise<HostProfile[]> {
  if (backend.listMode === 'rest' && backend.rest) {
    return backend.rest.list();
  }
  if (backend.gateway) {
    const rows = await tryTuiProfilesList(backend.gateway);
    if (rows) {
      return rows;
    }
  }
  if (backend.rest) {
    return backend.rest.list();
  }
  throw new ProfilesUnavailableError(
    "Couldn't load agents from this host. Check the connection, then try again.",
  );
}

async function readSoul(backend: Backend, id: string): Promise<string> {
  if (backend.rest) {
    try {
      const soul = await backend.rest.getSoul(id);
      return soul.content;
    } catch {
      // fall through to TUI
    }
  }
  if (backend.gateway) {
    try {
      const detail = await tuiProfilesDescribe(backend.gateway, id);
      return detail.soul;
    } catch {
      return '';
    }
  }
  return '';
}

async function writeDescription(backend: Backend, id: string, description: string): Promise<void> {
  if (backend.rest) {
    await backend.rest.putDescription(id, description);
    return;
  }
  if (backend.gateway) {
    await tuiProfilesConfigure(backend.gateway, { name: id, description });
    return;
  }
  throw new ProfilesReadOnlyError();
}

async function writeSoul(backend: Backend, id: string, content: string): Promise<void> {
  if (backend.rest) {
    await backend.rest.putSoul(id, content);
    return;
  }
  if (backend.gateway) {
    await tuiProfilesConfigure(backend.gateway, { name: id, soul: content });
    return;
  }
  throw new ProfilesReadOnlyError();
}

async function writeAppearance(
  backend: Backend,
  input: SaveHostAgentInput,
): Promise<string> {
  let currentId = input.id;
  const name = input.name.trim();
  const role = input.role.trim();
  const nameChanged = name !== input.previous.name.trim();
  const roleChanged = role !== input.previous.role.trim();

  if (!nameChanged && !roleChanged) {
    return currentId;
  }

  // Prefer TUI ui_meta.title for Role (or Name when Role empty / same).
  if (backend.gateway) {
    const title = role && role !== name ? role : name;
    try {
      await tuiProfilesConfigure(backend.gateway, {
        name: currentId,
        ui_meta: { title },
      });
    } catch {
      // continue with REST appearance if any
    }
  }

  if (backend.rest && nameChanged && name) {
    if (input.isDefault) {
      try {
        const renamed = await backend.rest.rename(currentId, name);
        currentId = renamed.name || currentId;
      } catch {
        // title may already be saved via configure
      }
    } else {
      const nextId = hostIdFromName(name);
      if (nextId && nextId !== currentId) {
        try {
          const renamed = await backend.rest.rename(currentId, nextId);
          currentId = renamed.name || nextId;
        } catch {
          // keep id
        }
      }
    }
  }

  if (!backend.gateway && !backend.rest) {
    throw new ProfilesReadOnlyError();
  }

  return currentId;
}

function createService(backend: Backend, seed: HostProfile[] | null): ProfilesService {
  const capabilities = buildCapabilities(backend);
  let cache = seed;

  const refresh = async () => {
    cache = await listProfiles(backend);
    return cache;
  };

  const loadEditor = async (id: string): Promise<HostAgentFields> => {
    const profiles = cache ?? (await refresh());
    const profile = findProfile(profiles, id);
    let description = profile.description ?? '';
    let soul = '';

    if (backend.gateway) {
      try {
        const detail = await tuiProfilesDescribe(backend.gateway, id);
        description = detail.description || description;
        soul = detail.soul;
      } catch {
        soul = await readSoul(backend, id);
      }
    } else {
      soul = await readSoul(backend, id);
    }

    return mapProfileToFields({ ...profile, description }, soul);
  };

  return {
    capabilities,
    list: refresh,
    loadEditor,
    async create(input) {
      if (!capabilities.canCreate) {
        throw new ProfilesReadOnlyError();
      }
      const hostId = hostIdFromName(input.name);
      const description = input.whatTheyDo?.trim() || undefined;
      const cloneFrom = input.cloneFrom?.trim() || undefined;

      let createdId = hostId;

      if (backend.rest) {
        const created = await backend.rest.create({
          name: hostId,
          description,
          ...(cloneFrom
            ? { clone_from: cloneFrom }
            : { clone_from_default: false, clone_all: false }),
        });
        createdId = created.name;
      } else if (backend.gateway) {
        const created = await tuiProfilesCreate(backend.gateway, {
          name: hostId,
          description,
          clone_from: cloneFrom,
        });
        createdId = created.name;
      } else {
        throw new ProfilesReadOnlyError();
      }

      if (backend.gateway && input.name.trim()) {
        try {
          await tuiProfilesConfigure(backend.gateway, {
            name: createdId,
            ui_meta: { title: input.name.trim() },
            ...(description ? { description } : {}),
          });
        } catch {
          // editor can finish appearance
        }
      } else if (backend.rest && createdId === 'default' && input.name.trim()) {
        try {
          await backend.rest.rename('default', input.name.trim());
        } catch {
          // ignore
        }
      }

      cache = null;
      return { id: createdId };
    },
    async save(input) {
      const canWrite =
        capabilities.canWriteDescription ||
        capabilities.canWriteSoul ||
        capabilities.canWriteAppearance;
      if (!canWrite) {
        throw new ProfilesReadOnlyError();
      }

      const prev = input.previous;
      let currentId = input.id;

      try {
        if (input.whatTheyDo !== prev.whatTheyDo) {
          await writeDescription(backend, currentId, input.whatTheyDo);
        }
        if (input.whoTheyAre !== prev.whoTheyAre) {
          await writeSoul(backend, currentId, input.whoTheyAre);
        }
        currentId = await writeAppearance(backend, { ...input, id: currentId });
      } catch (err) {
        if (err instanceof ProfilesReadOnlyError) {
          throw err;
        }
        throw new ProfilesReadOnlyError(
          err instanceof Error
            ? err.message
            : "This host doesn't allow editing agents yet.",
        );
      }

      cache = null;
      return loadEditor(currentId);
    },
    async remove(id) {
      if (id === 'default') {
        throw new Error('The default agent can’t be removed.');
      }
      if (!backend.rest) {
        throw new ProfilesReadOnlyError(
          "This host doesn't allow removing agents from the phone yet. Use the desktop dashboard.",
        );
      }
      await backend.rest.remove(id);
      cache = null;
    },
  };
}

function unavailableService(): ProfilesService {
  const fail = async (): Promise<never> => {
    throw new ProfilesUnavailableError(
      "Couldn't load agents from this host. Make sure you're connected to a dashboard-capable Hermes, then try again.",
    );
  };
  return {
    capabilities: {
      transport: 'none',
      canList: false,
      canCreate: false,
      canReadSoul: false,
      canWriteDescription: false,
      canWriteSoul: false,
      canRename: false,
      canDelete: false,
      canConfigure: false,
      canWriteAppearance: false,
    },
    list: fail,
    loadEditor: fail,
    create: fail,
    save: async () => {
      throw new ProfilesReadOnlyError();
    },
    remove: async () => {
      throw new ProfilesReadOnlyError();
    },
  };
}

/**
 * Prefer dashboard REST on the connect URL; fall back to TUI profiles.* on /api/ws.
 * When both exist, REST handles delete/rename/description/soul and TUI can set appearance title.
 */
export async function openProfilesService(options: {
  credentials: ConnectionCredentials | null;
  gateway: HermesGatewayClient | null;
  ensureGateway?: () => Promise<HermesGatewayClient>;
}): Promise<ProfilesService> {
  const { credentials } = options;
  let gateway = options.gateway;

  if ((!gateway || gateway.connectionState !== 'open') && options.ensureGateway) {
    try {
      gateway = await options.ensureGateway();
    } catch {
      gateway = null;
    }
  }
  if (gateway && gateway.connectionState !== 'open') {
    gateway = null;
  }

  const rest = credentials ? createRestProfilesClient(credentials) : null;
  let restList: HostProfile[] | null = null;
  if (credentials) {
    restList = await probeRestProfiles(credentials);
  }

  if (restList && rest) {
    return createService({ rest, gateway, listMode: 'rest' }, restList);
  }

  if (gateway) {
    const tuiList = await tryTuiProfilesList(gateway);
    if (tuiList) {
      return createService({ rest, gateway, listMode: 'tui' }, tuiList);
    }
  }

  return unavailableService();
}
