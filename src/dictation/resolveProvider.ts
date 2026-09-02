import { isDictationStubEnabled } from './config';
import { CloudProvider } from './providers/cloud';
import { OnDeviceProvider } from './providers/onDevice';
import { StubProvider } from './providers/stub';
import { UnavailableProvider } from './providers/unavailable';
import type { DictationCatalogEntry, DictationProvider } from './types';
import {
  loadCloudSttConfig,
  loadDictationProviderPreference,
  loadOnDeviceModelId,
  type DictationProviderPreference,
} from '../storage/dictationCloud';

let cached: DictationProvider | null = null;
let preference: DictationProviderPreference | null = null;
let hydrated = false;

/**
 * Load Secure Store preference before resolve. Safe to call repeatedly.
 * Settings should call this after save so the composer picks up the engine.
 */
export async function hydrateDictationPreference(): Promise<void> {
  preference = await loadDictationProviderPreference();
  hydrated = true;
  cached = null;
}

/** Active engine. Prefer the user's Settings selection when set. */
export function resolveDictationProvider(): DictationProvider {
  if (!cached) {
    if (preference === 'cloud') {
      cached = new CloudProvider(loadCloudSttConfig);
    } else if (preference === 'on_device') {
      cached = new OnDeviceProvider(loadOnDeviceModelId);
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
    blurb: 'Download a small Whisper model and run locally. Audio never leaves the phone.',
    available: true,
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
