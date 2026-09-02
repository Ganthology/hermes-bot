/** Speech-to-text engine used by the composer mic. */

export type TranscribeSource =
  | { kind: 'uri'; uri: string }
  | { kind: 'bytes'; bytes: Uint8Array };

export type TranscribeOptions = {
  /** BCP-47 hint when a real engine supports it. */
  language?: string;
  mimeType?: string;
};

export type DictationProviderId =
  | 'unavailable'
  | 'stub'
  | 'on_device'
  | 'cloud'
  | 'hermes_host';

export interface DictationProvider {
  readonly id: DictationProviderId;
  readonly label: string;
  /**
   * Turn recorded audio into plain text for the chat composer path.
   * Implementations must reject (never resolve empty junk) when transcription fails.
   */
  transcribe(source: TranscribeSource, opts?: TranscribeOptions): Promise<string>;
}

export type DictationErrorCode =
  | 'permission'
  | 'too_short'
  | 'no_provider'
  | 'failed'
  | 'cancelled';

export class DictationError extends Error {
  readonly code: DictationErrorCode;

  constructor(code: DictationErrorCode, message: string) {
    super(message);
    this.name = 'DictationError';
    this.code = code;
  }
}

export type DictationPhase = 'idle' | 'recording' | 'transcribing';

/** Engines listed in Settings. `available: false` stays greyed follow-up. */
export type DictationCatalogEntry = {
  id: DictationProviderId;
  label: string;
  blurb: string;
  available: boolean;
};
