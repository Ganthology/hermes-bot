/**
 * Cloud STT engines — phone talks to the provider directly (no Hermes Bot proxy).
 */

export type CloudSttEngine = 'groq' | 'openai';

export type CloudEngineMeta = {
  id: CloudSttEngine;
  label: string;
  defaultModel: string;
  defaultBaseUrl: string;
  /** Suggested model ids the user can tap; free-text override still allowed. */
  modelSuggestions: string[];
};

export const CLOUD_ENGINES: readonly CloudEngineMeta[] = [
  {
    id: 'groq',
    label: 'Groq Whisper',
    defaultModel: 'whisper-large-v3-turbo',
    defaultBaseUrl: 'https://api.groq.com/openai/v1',
    modelSuggestions: ['whisper-large-v3-turbo', 'whisper-large-v3'],
  },
  {
    id: 'openai',
    label: 'OpenAI',
    defaultModel: 'gpt-4o-mini-transcribe',
    defaultBaseUrl: 'https://api.openai.com/v1',
    modelSuggestions: ['gpt-4o-mini-transcribe', 'gpt-4o-transcribe', 'whisper-1'],
  },
] as const;

export function cloudEngineMeta(engine: CloudSttEngine): CloudEngineMeta {
  const found = CLOUD_ENGINES.find((entry) => entry.id === engine);
  if (!found) {
    return CLOUD_ENGINES[0];
  }
  return found;
}

/** Strip trailing slash; fall back to the engine’s public OpenAI-compatible base. */
export function resolveCloudBaseUrl(engine: CloudSttEngine, baseUrl?: string | null): string {
  const trimmed = baseUrl?.trim();
  if (trimmed) {
    return trimmed.replace(/\/+$/, '');
  }
  return cloudEngineMeta(engine).defaultBaseUrl;
}

export function resolveCloudModel(engine: CloudSttEngine, model?: string | null): string {
  const trimmed = model?.trim();
  if (trimmed) {
    return trimmed;
  }
  return cloudEngineMeta(engine).defaultModel;
}
