import { DictationError, type DictationProvider, type TranscribeOptions, type TranscribeSource } from '../types';

/** No cloud key selected — Settings → Dictation → Cloud. */
export class UnavailableProvider implements DictationProvider {
  readonly id = 'unavailable' as const;
  readonly label = 'None yet';

  async transcribe(_source: TranscribeSource, _opts?: TranscribeOptions): Promise<string> {
    throw new DictationError(
      'no_provider',
      'Pick Cloud in Settings → Dictation and add a Groq or OpenAI API key.',
    );
  }
}
