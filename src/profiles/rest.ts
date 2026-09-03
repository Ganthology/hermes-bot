import { normalizeHttpBase } from '../gateway/url';
import type { ConnectionCredentials } from '../storage/credentials';
import { parseProfilesListPayload } from './map';
import type { HostProfile } from './types';

export type RestProfilesClient = {
  list: () => Promise<HostProfile[]>;
  create: (body: {
    name: string;
    description?: string;
    clone_from?: string;
    clone_from_default?: boolean;
    clone_all?: boolean;
  }) => Promise<{ name: string }>;
  rename: (name: string, newName: string) => Promise<{ name: string; display_name?: string }>;
  putDescription: (name: string, description: string) => Promise<void>;
  getSoul: (name: string) => Promise<{ content: string; exists: boolean }>;
  putSoul: (name: string, content: string) => Promise<void>;
  remove: (name: string) => Promise<void>;
};

type RestErrorBody = {
  detail?: unknown;
  message?: unknown;
};

function authHeaders(token: string): Record<string, string> {
  return {
    Accept: 'application/json',
    Authorization: `Bearer ${token}`,
    'X-Hermes-Session-Token': token,
  };
}

async function readErrorMessage(res: Response): Promise<string> {
  try {
    const body = (await res.json()) as RestErrorBody;
    if (typeof body.detail === 'string' && body.detail.trim()) {
      return body.detail.trim();
    }
    if (Array.isArray(body.detail)) {
      const parts = body.detail
        .map((item) => {
          if (typeof item === 'string') {
            return item;
          }
          if (item && typeof item === 'object' && 'msg' in item) {
            return String((item as { msg: unknown }).msg);
          }
          return '';
        })
        .filter(Boolean);
      if (parts.length) {
        return parts.join('; ');
      }
    }
    if (typeof body.message === 'string' && body.message.trim()) {
      return body.message.trim();
    }
  } catch {
    // ignore parse errors
  }
  return `Request failed (${res.status})`;
}

async function restFetch(
  credentials: ConnectionCredentials,
  path: string,
  init: RequestInit & { timeoutMs?: number } = {},
): Promise<Response> {
  const httpBase = normalizeHttpBase(credentials.baseUrl);
  const controller = new AbortController();
  const timeoutMs = init.timeoutMs ?? 15_000;
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const headers = new Headers(init.headers);
    const auth = authHeaders(credentials.token);
    for (const [key, value] of Object.entries(auth)) {
      if (!headers.has(key)) {
        headers.set(key, value);
      }
    }
    if (init.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    return await fetch(`${httpBase}${path}`, {
      ...init,
      headers,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Dashboard REST client for /api/profiles (same host as connect, not :8642).
 */
export function createRestProfilesClient(credentials: ConnectionCredentials): RestProfilesClient {
  return {
    async list() {
      const res = await restFetch(credentials, '/api/profiles', { method: 'GET' });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      const body = await res.json();
      return parseProfilesListPayload(body);
    },

    async create(body) {
      const res = await restFetch(credentials, '/api/profiles', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      const json = (await res.json()) as { name?: string };
      const name = typeof json.name === 'string' ? json.name.trim() : body.name;
      return { name };
    },

    async rename(name, newName) {
      const res = await restFetch(credentials, `/api/profiles/${encodeURIComponent(name)}`, {
        method: 'PATCH',
        body: JSON.stringify({ new_name: newName }),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      return (await res.json()) as { name: string; display_name?: string };
    },

    async putDescription(name, description) {
      const res = await restFetch(
        credentials,
        `/api/profiles/${encodeURIComponent(name)}/description`,
        {
          method: 'PUT',
          body: JSON.stringify({ description }),
        },
      );
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
    },

    async getSoul(name) {
      const res = await restFetch(credentials, `/api/profiles/${encodeURIComponent(name)}/soul`, {
        method: 'GET',
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
      const json = (await res.json()) as { content?: unknown; exists?: unknown };
      return {
        content: typeof json.content === 'string' ? json.content : '',
        exists: Boolean(json.exists),
      };
    },

    async putSoul(name, content) {
      const res = await restFetch(credentials, `/api/profiles/${encodeURIComponent(name)}/soul`, {
        method: 'PUT',
        body: JSON.stringify({ content }),
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
    },

    async remove(name) {
      const res = await restFetch(credentials, `/api/profiles/${encodeURIComponent(name)}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        throw new Error(await readErrorMessage(res));
      }
    },
  };
}

/** Probe whether dashboard profile REST answers on this host. */
export async function probeRestProfiles(
  credentials: ConnectionCredentials,
): Promise<HostProfile[] | null> {
  try {
    const client = createRestProfilesClient(credentials);
    return await client.list();
  } catch {
    return null;
  }
}
