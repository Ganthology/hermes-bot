import type { DictationProvider, TranscribeOptions, TranscribeSource } from '../types';

const STUB_DELAY_MS = 450;
const STUB_TRANSCRIPT = 'Hello from the dictation stub';

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

/**
 * Dev / review stub. Fakes a short transcript so record → stop → send chrome
 * is exercisable without a real model. Not a product engine.
 */
export class StubProvider implements DictationProvider {
  readonly id = 'stub' as const;
  readonly label = 'Demo stub';

  async transcribe(_source: TranscribeSource, _opts?: TranscribeOptions): Promise<string> {
    await wait(STUB_DELAY_MS);
    return STUB_TRANSCRIPT;
  }
}
