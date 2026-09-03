import type { HostAgentFields, HostProfile } from './types';

/** Humanize a host id for display when no display name exists. */
export function prettifyHostId(id: string): string {
  const trimmed = id.trim();
  if (!trimmed) {
    return 'Agent';
  }
  if (trimmed === 'default') {
    return 'Default';
  }
  return trimmed
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

/**
 * Derive a host id from a display Name for create / optional rename.
 * Lowercase, hyphenated, safe characters only.
 */
export function hostIdFromName(name: string): string {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || 'agent';
}

function readUiTitle(profile: HostProfile): string {
  const meta = profile.ui_meta;
  if (!meta || typeof meta !== 'object') {
    return '';
  }
  const title = meta.title;
  return typeof title === 'string' ? title.trim() : '';
}

/**
 * Map host profile metadata → user-facing editor fields (without soul).
 * Role uses ui_meta.title when present, else display_name (no invented store).
 */
export function mapProfileToFields(
  profile: HostProfile,
  whoTheyAre = '',
): HostAgentFields {
  const display = (profile.display_name ?? '').trim();
  const title = readUiTitle(profile);
  const pretty = prettifyHostId(profile.name);

  let name: string;
  let role: string;

  if (display && title) {
    name = display;
    role = title;
  } else if (display) {
    // Host only has description + display_name — Role maps to display_name.
    name = display;
    role = display;
  } else if (title) {
    name = title;
    role = title;
  } else {
    name = pretty;
    role = '';
  }

  return {
    id: profile.name,
    isDefault: Boolean(profile.is_default) || profile.name === 'default',
    name,
    role,
    whatTheyDo: (profile.description ?? '').trim(),
    whoTheyAre,
  };
}

export function rosterSubtitle(fields: Pick<HostAgentFields, 'role' | 'whatTheyDo'>): string {
  if (fields.role.trim() && fields.whatTheyDo.trim() && fields.role !== fields.whatTheyDo) {
    return fields.role.trim();
  }
  if (fields.whatTheyDo.trim()) {
    return fields.whatTheyDo.trim();
  }
  if (fields.role.trim()) {
    return fields.role.trim();
  }
  return 'Agent';
}

export function parseProfilesListPayload(payload: unknown): HostProfile[] {
  if (!payload || typeof payload !== 'object') {
    return [];
  }
  const profiles = (payload as { profiles?: unknown }).profiles;
  if (!Array.isArray(profiles)) {
    return [];
  }
  const out: HostProfile[] = [];
  for (const row of profiles) {
    if (!row || typeof row !== 'object') {
      continue;
    }
    const name = (row as { name?: unknown }).name;
    if (typeof name !== 'string' || !name.trim()) {
      continue;
    }
    const raw = row as Record<string, unknown>;
    out.push({
      name: name.trim(),
      display_name: typeof raw.display_name === 'string' ? raw.display_name : '',
      description: typeof raw.description === 'string' ? raw.description : '',
      description_auto: Boolean(raw.description_auto),
      is_default: Boolean(raw.is_default) || name.trim() === 'default',
      model: typeof raw.model === 'string' ? raw.model : null,
      provider: typeof raw.provider === 'string' ? raw.provider : null,
      ui_meta:
        raw.ui_meta && typeof raw.ui_meta === 'object'
          ? (raw.ui_meta as Record<string, unknown>)
          : null,
      path: typeof raw.path === 'string' ? raw.path : undefined,
    });
  }
  return out;
}
