import { DictationError, type DictationProvider, type TranscribeOptions, type TranscribeSource } from '../types';

/** Default engine for this PR — no real STT yet. */
export class UnavailableProvider implements DictationProvider {
  readonly id = 'unavailable' as const;
  readonly label = 'None yet';

  async transcribe(_source: TranscribeSource, _opts?: TranscribeOptions): Promise<string> {
    throw new DictationError(
      'no_provider',
      'Pick a dictation engine in a follow-up — cloud STT and on-device Whisper are next.',
    );
  }
}
