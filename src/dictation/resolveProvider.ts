import { isDictationStubEnabled } from './config';
import { CloudProvider } from './providers/cloud';
import { StubProvider } from './providers/stub';
import { UnavailableProvider } from './providers/unavailable';
import type { DictationCatalogEntry, DictationProvider } from './types';
import {
  loadCloudSttConfig,
  loadDictationProviderPreference,
  type DictationProviderPreference,
} from '../storage/dictationCloud';

let cached: DictationProvider | null = null;
let preference: DictationProviderPreference | null = null;
let hydrated = false;

/**
 * Load Secure Store preference before resolve. Safe to call repeatedly.
 * Settings should call this after save so the composer picks up Cloud.
 */
export async function hydrateDictationPreference(): Promise<void> {
  preference = await loadDictationProviderPreference();
  hydrated = true;
  cached = null;
}

/** Active engine. Prefer Cloud when the user selected it in Settings. */
export function resolveDictationProvider(): DictationProvider {
  if (!cached) {
    if (preference === 'cloud') {
      cached = new CloudProvider(loadCloudSttConfig);
    } else if (isDictationStubEnabled()) {
      cached = new StubProvider();
    } else {
      cached = new UnavailableProvider();
    }
  }
  return cached;
}

/** Whether Secure Store preference has been loaded at least once this session. */
export function isDictationPreferenceHydrated(): boolean {
  return hydrated;
}

/** Reset cache — tests / after Settings save / hot reload. */
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
    blurb: 'Phone → Groq or OpenAI (or compatible) HTTP STT. Key stays on device.',
    available: true,
  },
  {
    id: 'hermes_host',
    label: 'Hermes host',
    blurb:
      'No documented TUI/gateway STT RPC yet — skipped. Stays a follow-up if Hermes exposes one.',
    available: false,
  },
];
