import { isDictationStubEnabled } from './config';
import { StubProvider } from './providers/stub';
import { UnavailableProvider } from './providers/unavailable';
import type { DictationCatalogEntry, DictationProvider } from './types';

let cached: DictationProvider | null = null;

/** Active engine for this build. Real STT providers arrive in follow-up PRs. */
export function resolveDictationProvider(): DictationProvider {
  if (!cached) {
    cached = isDictationStubEnabled() ? new StubProvider() : new UnavailableProvider();
  }
  return cached;
}

/** Reset cache — tests / hot reload only. */
export function resetDictationProviderCache(): void {
  cached = null;
}

export const DICTATION_CATALOG: DictationCatalogEntry[] = [
  {
    id: 'on_device',
    label: 'On-device Whisper',
    blurb: 'Runs locally on the phone. Coming in a follow-up PR.',
    available: false,
  },
  {
    id: 'cloud',
    label: 'Cloud API',
    blurb: 'OpenAI / Groq-style HTTP STT. Coming in a follow-up PR.',
    available: false,
  },
  {
    id: 'hermes_host',
    label: 'Hermes host',
    blurb: 'Transcribe via your Hermes instance. Coming in a follow-up PR.',
    available: false,
  },
];
