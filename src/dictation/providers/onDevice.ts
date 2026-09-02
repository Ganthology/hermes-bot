import { NativeModules, Platform } from 'react-native';

import { getModelPath } from '../onDeviceModelStore';
import { onDeviceModelMeta, type OnDeviceModelId } from '../onDeviceModels';
import { DictationError, type DictationProvider, type TranscribeOptions, type TranscribeSource } from '../types';

type WhisperModule = typeof import('whisper.rn');

function isWhisperNativeAvailable(): boolean {
  // Expo Go / missing prebuild → native module absent.
  const mods = NativeModules as Record<string, unknown>;
  return Boolean(mods.RNWhisper);
}

function normalizePath(uri: string): string {
  // whisper.rn accepts file:// and absolute paths.
  return uri;
}

function humanNativeMissing(): string {
  return (
    'On-device Whisper needs a custom native build (expo-dev-client / prebuild), not Expo Go. ' +
    'Run `npx expo prebuild` then `npx expo run:ios` or `npx expo run:android`.'
  );
}

function humanOom(message: string): string {
  if (/memory|oom|alloc|out of memory/i.test(message)) {
    return 'The phone ran out of memory loading the Whisper model. Try the Tiny model, or free RAM and retry.';
  }
  return message;
}

/**
 * Local whisper.cpp inference via whisper.rn.
 * Audio never leaves the device. Requires a downloaded GGML model + native build.
 */
export class OnDeviceProvider implements DictationProvider {
  readonly id = 'on_device' as const;
  readonly label = 'On-device Whisper';

  constructor(private readonly getModelId: () => Promise<OnDeviceModelId>) {}

  async transcribe(source: TranscribeSource, opts?: TranscribeOptions): Promise<string> {
    if (!isWhisperNativeAvailable()) {
      throw new DictationError('no_provider', humanNativeMissing());
    }

    if (source.kind !== 'uri') {
      throw new DictationError(
        'failed',
        'On-device dictation needs a recorded audio file. Try again.',
      );
    }

    const modelId = await this.getModelId();
    const modelPath = getModelPath(modelId);
    if (!modelPath) {
      const meta = onDeviceModelMeta(modelId);
      throw new DictationError(
        'no_provider',
        `Download the ${meta.label} model in Settings → Dictation before using on-device Whisper.`,
      );
    }

    let whisper: WhisperModule;
    try {
      whisper = await import('whisper.rn');
    } catch {
      throw new DictationError('no_provider', humanNativeMissing());
    }

    let context: Awaited<ReturnType<WhisperModule['initWhisper']>> | null = null;
    try {
      context = await whisper.initWhisper({
        filePath: normalizePath(modelPath),
        useGpu: Platform.OS === 'ios',
        useCoreMLIos: false, // GGML-only download path — no Core ML encoder zip.
      });
    } catch (error) {
      const raw = error instanceof Error ? error.message : 'Could not load the Whisper model.';
      throw new DictationError('failed', humanOom(raw));
    }

    try {
      const language = opts?.language?.trim() || 'en';
      const { promise } = context.transcribe(normalizePath(source.uri), {
        language,
        // English .en models are English-only; keep language pinned.
      });
      const result = await promise;
      if (result.isAborted) {
        throw new DictationError('cancelled', 'Dictation cancelled.');
      }
      const text = (result.result ?? '').trim();
      if (!text) {
        throw new DictationError(
          'failed',
          'No speech detected in that recording. Try again a little louder or longer.',
        );
      }
      return text;
    } catch (error) {
      if (error instanceof DictationError) {
        throw error;
      }
      const raw = error instanceof Error ? error.message : 'Could not transcribe that recording.';
      throw new DictationError('failed', humanOom(raw));
    } finally {
      try {
        await context?.release();
      } catch {
        // Native release best-effort.
      }
    }
  }
}

export { isWhisperNativeAvailable };
