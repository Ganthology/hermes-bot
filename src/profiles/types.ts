/**
 * Host agent (Hermes profile) types for Bot Mode CRUD.
 * User-facing copy never uses these file/path names — see map.ts.
 */

export type HostProfile = {
  /** Host id (directory name). Hidden in default UI. */
  name: string;
  display_name?: string;
  description?: string;
  description_auto?: boolean;
  is_default?: boolean;
  model?: string | null;
  provider?: string | null;
  ui_meta?: Record<string, unknown> | null;
  path?: string;
};

export type HostAgentFields = {
  /** Host id — Advanced only. */
  id: string;
  isDefault: boolean;
  /** What they appear as. */
  name: string;
  /** One-line title (e.g. Hiring specialist). */
  role: string;
  /** 1–2 sentences — host description. */
  whatTheyDo: string;
  /** Personality / standing instructions — soul content. */
  whoTheyAre: string;
};

export type ProfilesTransport = 'rest' | 'tui' | 'none';

export type ProfilesCapabilities = {
  transport: ProfilesTransport;
  canList: boolean;
  canCreate: boolean;
  canReadSoul: boolean;
  canWriteDescription: boolean;
  canWriteSoul: boolean;
  canRename: boolean;
  canDelete: boolean;
  canConfigure: boolean;
  /** true when appearance can be written without renaming the host id */
  canWriteAppearance: boolean;
};

export type CreateHostAgentInput = {
  /** Desired appearance name (not necessarily the host id). */
  name: string;
  whatTheyDo?: string;
  /** When set, clone config/soul from this host id (not clone-all). */
  cloneFrom?: string | null;
};

export type SaveHostAgentInput = {
  id: string;
  name: string;
  role: string;
  whatTheyDo: string;
  whoTheyAre: string;
  isDefault: boolean;
  /** Prior fields for diffing writes. */
  previous: HostAgentFields;
};

export class ProfilesUnavailableError extends Error {
  constructor(message = "Couldn't load agents from this host") {
    super(message);
    this.name = 'ProfilesUnavailableError';
  }
}

export class ProfilesReadOnlyError extends Error {
  constructor(
    message = "This host doesn't allow editing agents yet. Update Hermes or use the desktop dashboard.",
  ) {
    super(message);
    this.name = 'ProfilesReadOnlyError';
  }
}
