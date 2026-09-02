import { DictationError, type DictationErrorCode } from './types';

const MESSAGES: Record<DictationErrorCode, string> = {
  permission: 'Microphone access is off. Enable it in system Settings to dictate.',
  too_short: 'That was too short to transcribe. Tap the mic, speak, then tap stop.',
  no_provider:
    'Pick On-device or Cloud in Settings → Dictation, then try again.',
  failed: 'Could not transcribe that recording. Try again.',
  cancelled: 'Dictation cancelled.',
};

export function humanDictationMessage(code: DictationErrorCode, fallback?: string): string {
  return fallback?.trim() || MESSAGES[code];
}

export function toDictationError(error: unknown): DictationError {
  if (error instanceof DictationError) {
    return error;
  }
  if (error instanceof Error && error.message.trim()) {
    return new DictationError('failed', error.message);
  }
  return new DictationError('failed', MESSAGES.failed);
}
