import { DictationError, type DictationProvider, type TranscribeOptions, type TranscribeSource } from '../types';

/** No engine selected — Settings → Dictation. */
export class UnavailableProvider implements DictationProvider {
  readonly id = 'unavailable' as const;
  readonly label = 'None yet';

  async transcribe(_source: TranscribeSource, _opts?: TranscribeOptions): Promise<string> {
    throw new DictationError(
      'no_provider',
      'Pick On-device or Cloud in Settings → Dictation, then try again.',
    );
  }
}
