import {
  resolveCloudBaseUrl,
  resolveCloudModel,
  type CloudSttEngine,
} from '../cloudDefaults';
import { DictationError, type DictationProvider, type TranscribeOptions, type TranscribeSource } from '../types';
import type { CloudSttConfig } from '../../storage/dictationCloud';

type TranscriptionJson = {
  text?: unknown;
};

function mimeAndName(opts?: TranscribeOptions, uri?: string): { mimeType: string; fileName: string } {
  const mimeType = opts?.mimeType?.trim() || guessMimeFromUri(uri) || 'audio/mp4';
  const fileName = fileNameForMime(mimeType, uri);
  return { mimeType, fileName };
}

function guessMimeFromUri(uri?: string): string | null {
  if (!uri) {
    return null;
  }
  const lower = uri.toLowerCase();
  if (lower.includes('.webm')) {
    return 'audio/webm';
  }
  if (lower.includes('.wav')) {
    return 'audio/wav';
  }
  if (lower.includes('.mp3')) {
    return 'audio/mpeg';
  }
  if (lower.includes('.m4a') || lower.includes('.mp4') || lower.includes('.aac')) {
    return 'audio/mp4';
  }
  if (lower.includes('.ogg')) {
    return 'audio/ogg';
  }
  return null;
}

function fileNameForMime(mimeType: string, uri?: string): string {
  if (uri) {
    const leaf = uri.split('/').pop();
    if (leaf && leaf.includes('.')) {
      return leaf.split('?')[0] ?? leaf;
    }
  }
  if (mimeType.includes('webm')) {
    return 'recording.webm';
  }
  if (mimeType.includes('wav')) {
    return 'recording.wav';
  }
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) {
    return 'recording.mp3';
  }
  return 'recording.m4a';
}

function appendAudioFile(
  form: FormData,
  source: TranscribeSource,
  opts?: TranscribeOptions,
): void {
  if (source.kind === 'uri') {
    const { mimeType, fileName } = mimeAndName(opts, source.uri);
    // React Native FormData file shape (uri/name/type).
    form.append('file', {
      uri: source.uri,
      name: fileName,
      type: mimeType,
    } as unknown as Blob);
    return;
  }

  const { mimeType, fileName } = mimeAndName(opts);
  const copy = Uint8Array.from(source.bytes);
  form.append('file', new Blob([copy], { type: mimeType }), fileName);
}

function humanHttpError(status: number, bodyText: string, engine: CloudSttEngine): string {
  if (status === 401 || status === 403) {
    return 'That API key was rejected. Check it in Settings → Dictation.';
  }
  if (status === 404) {
    return 'Speech API endpoint not found. Check the base URL in Settings → Dictation.';
  }
  if (status === 429) {
    return 'The speech API rate-limited this request. Wait a moment and try again.';
  }
  const snippet = bodyText.replace(/\s+/g, ' ').trim().slice(0, 160);
  if (snippet) {
    return `Speech API error (${status}): ${snippet}`;
  }
  const who = engine === 'groq' ? 'Groq' : 'OpenAI';
  return `${who} could not transcribe that recording (${status}). Try again.`;
}

function networkMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return 'Could not reach the speech API. Check your connection and try again.';
  }
  if (error instanceof Error && /network|fetch|failed to connect/i.test(error.message)) {
    return 'Could not reach the speech API. Check your connection and try again.';
  }
  return 'Could not reach the speech API. Try again.';
}

/**
 * Direct phone → OpenAI-compatible `/audio/transcriptions` (Groq or OpenAI).
 * No Hermes Bot backend and no host proxy.
 */
export class CloudProvider implements DictationProvider {
  readonly id = 'cloud' as const;
  readonly label = 'Cloud API';

  constructor(private readonly getConfig: () => Promise<CloudSttConfig | null>) {}

  async transcribe(source: TranscribeSource, opts?: TranscribeOptions): Promise<string> {
    const config = await this.getConfig();
    if (!config?.apiKey) {
      throw new DictationError(
        'no_provider',
        'Add a cloud STT API key in Settings → Dictation, then try again.',
      );
    }

    const baseUrl = resolveCloudBaseUrl(config.engine, config.baseUrl);
    const model = resolveCloudModel(config.engine, config.model);
    const url = `${baseUrl}/audio/transcriptions`;

    const form = new FormData();
    appendAudioFile(form, source, opts);
    form.append('model', model);
    if (opts?.language?.trim()) {
      form.append('language', opts.language.trim());
    }

    let response: Response;
    try {
      response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${config.apiKey}`,
        },
        body: form,
      });
    } catch (error) {
      throw new DictationError('failed', networkMessage(error));
    }

    const bodyText = await response.text();
    if (!response.ok) {
      throw new DictationError('failed', humanHttpError(response.status, bodyText, config.engine));
    }

    let parsed: TranscriptionJson;
    try {
      parsed = JSON.parse(bodyText) as TranscriptionJson;
    } catch {
      throw new DictationError('failed', 'Speech API returned a non-JSON response.');
    }

    const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
    if (!text) {
      throw new DictationError(
        'failed',
        'No speech detected in that recording. Try again a little louder or longer.',
      );
    }
    return text;
  }
}
