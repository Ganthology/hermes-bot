import * as SecureStore from 'expo-secure-store';

import type { CloudSttEngine } from '../dictation/cloudDefaults';
import {
  DEFAULT_ON_DEVICE_MODEL_ID,
  parseOnDeviceModelId,
  type OnDeviceModelId,
} from '../dictation/onDeviceModels';

const PROVIDER_KEY = 'hermes_bot_dictation_provider';
const ENGINE_KEY = 'hermes_bot_stt_engine';
const API_KEY_KEY = 'hermes_bot_stt_api_key';
const MODEL_KEY = 'hermes_bot_stt_model';
const BASE_URL_KEY = 'hermes_bot_stt_base_url';
const ON_DEVICE_MODEL_KEY = 'hermes_bot_on_device_model';

/** User-selected dictation engine. Hermes host stays unavailable (no RPC). */
export type DictationProviderPreference = 'cloud' | 'on_device';

export type CloudSttConfig = {
  engine: CloudSttEngine;
  apiKey: string;
  /** Empty → use engine default at request time. */
  model: string;
  /** Empty → use engine default OpenAI-compatible base. */
  baseUrl: string;
};

function parseEngine(raw: string | null): CloudSttEngine {
  return raw === 'openai' ? 'openai' : 'groq';
}

function parsePreference(raw: string | null): DictationProviderPreference | null {
  if (raw === 'cloud' || raw === 'on_device') {
    return raw;
  }
  return null;
}

export async function loadDictationProviderPreference(): Promise<DictationProviderPreference | null> {
  const raw = await SecureStore.getItemAsync(PROVIDER_KEY);
  return parsePreference(raw);
}

export async function saveDictationProviderPreference(
  preference: DictationProviderPreference | null,
): Promise<void> {
  if (!preference) {
    await SecureStore.deleteItemAsync(PROVIDER_KEY);
    return;
  }
  await SecureStore.setItemAsync(PROVIDER_KEY, preference);
}

export async function loadOnDeviceModelId(): Promise<OnDeviceModelId> {
  const raw = await SecureStore.getItemAsync(ON_DEVICE_MODEL_KEY);
  return parseOnDeviceModelId(raw);
}

export async function saveOnDeviceModelId(modelId: OnDeviceModelId): Promise<void> {
  await SecureStore.setItemAsync(ON_DEVICE_MODEL_KEY, modelId);
}

export async function loadCloudSttConfig(): Promise<CloudSttConfig | null> {
  const [engine, apiKey, model, baseUrl] = await Promise.all([
    SecureStore.getItemAsync(ENGINE_KEY),
    SecureStore.getItemAsync(API_KEY_KEY),
    SecureStore.getItemAsync(MODEL_KEY),
    SecureStore.getItemAsync(BASE_URL_KEY),
  ]);
  if (!apiKey?.trim()) {
    return null;
  }
  return {
    engine: parseEngine(engine),
    apiKey: apiKey.trim(),
    model: model?.trim() ?? '',
    baseUrl: baseUrl?.trim() ?? '',
  };
}

/**
 * Persist cloud STT settings. API key is required to save a usable config.
 * Model / base URL may be blank (defaults apply at request time).
 */
export async function saveCloudSttConfig(config: {
  engine: CloudSttEngine;
  apiKey: string;
  model?: string;
  baseUrl?: string;
}): Promise<void> {
  const apiKey = config.apiKey.trim();
  if (!apiKey) {
    throw new Error('Paste a cloud STT API key before saving.');
  }
  await Promise.all([
    SecureStore.setItemAsync(ENGINE_KEY, config.engine),
    SecureStore.setItemAsync(API_KEY_KEY, apiKey),
    SecureStore.setItemAsync(MODEL_KEY, config.model?.trim() ?? ''),
    SecureStore.setItemAsync(BASE_URL_KEY, config.baseUrl?.trim() ?? ''),
  ]);
}

/** Clears key + overrides. Does not change the selected engine preference. */
export async function clearCloudSttConfig(): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(ENGINE_KEY),
    SecureStore.deleteItemAsync(API_KEY_KEY),
    SecureStore.deleteItemAsync(MODEL_KEY),
    SecureStore.deleteItemAsync(BASE_URL_KEY),
  ]);
}

/** Draft fields for Settings (key may be empty while editing). */
export async function loadCloudSttDraft(): Promise<{
  engine: CloudSttEngine;
  apiKey: string;
  model: string;
  baseUrl: string;
  hasKey: boolean;
}> {
  const [engine, apiKey, model, baseUrl] = await Promise.all([
    SecureStore.getItemAsync(ENGINE_KEY),
    SecureStore.getItemAsync(API_KEY_KEY),
    SecureStore.getItemAsync(MODEL_KEY),
    SecureStore.getItemAsync(BASE_URL_KEY),
  ]);
  return {
    engine: parseEngine(engine),
    apiKey: apiKey ?? '',
    model: model ?? '',
    baseUrl: baseUrl ?? '',
    hasKey: Boolean(apiKey?.trim()),
  };
}

export { DEFAULT_ON_DEVICE_MODEL_ID };
