/**
 * Build a 16-bit PCM WAV in cache from streamed mic buffers.
 * whisper.rn (and most STT APIs) accept this format.
 */

import { Directory, File, Paths } from 'expo-file-system';

const SAMPLE_RATE = 16_000;
const CHANNELS = 1;
const BITS_PER_SAMPLE = 16;

export type WavCaptureSession = {
  append: (pcm: ArrayBuffer) => void;
  /** Peak level 0–1 from the last appended chunk. */
  lastLevel: () => number;
  /** Bytes of PCM collected so far. */
  byteLength: () => number;
  /** Write WAV to cache and return its file:// URI. */
  finalize: () => Promise<string>;
  discard: () => void;
};

function createWavHeader(dataSize: number): Uint8Array {
  const header = new ArrayBuffer(44);
  const view = new DataView(header);
  const byteRate = SAMPLE_RATE * CHANNELS * (BITS_PER_SAMPLE / 8);
  const blockAlign = CHANNELS * (BITS_PER_SAMPLE / 8);

  writeAscii(view, 0, 'RIFF');
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(view, 8, 'WAVE');
  writeAscii(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, CHANNELS, true);
  view.setUint32(24, SAMPLE_RATE, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, BITS_PER_SAMPLE, true);
  writeAscii(view, 36, 'data');
  view.setUint32(40, dataSize, true);
  return new Uint8Array(header);
}

function writeAscii(view: DataView, offset: number, text: string): void {
  for (let i = 0; i < text.length; i += 1) {
    view.setUint8(offset + i, text.charCodeAt(i));
  }
}

function peakLevel(pcm: Int16Array): number {
  if (pcm.length === 0) {
    return 0;
  }
  let max = 0;
  for (let i = 0; i < pcm.length; i += 1) {
    const abs = Math.abs(pcm[i] ?? 0);
    if (abs > max) {
      max = abs;
    }
  }
  return Math.min(1, max / 32768);
}

function ensureDictationCacheDir(): Directory {
  const dir = new Directory(Paths.cache, 'dictation');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * Start an in-memory PCM capture that finalizes to a WAV file in cache.
 */
export function startWavCapture(): WavCaptureSession {
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  let level = 0;
  let discarded = false;

  return {
    append(pcm) {
      if (discarded) {
        return;
      }
      const copy = new Uint8Array(pcm.slice(0));
      chunks.push(copy);
      totalBytes += copy.byteLength;
      level = peakLevel(new Int16Array(copy.buffer, copy.byteOffset, copy.byteLength / 2));
    },
    lastLevel: () => level,
    byteLength: () => totalBytes,
    async finalize() {
      if (discarded) {
        throw new Error('Recording was cancelled.');
      }
      if (totalBytes < SAMPLE_RATE) {
        // Less than ~30 ms of mono 16-bit audio.
        throw new Error('That recording was empty.');
      }

      const dir = ensureDictationCacheDir();
      const file = new File(dir, `rec-${Date.now()}.wav`);
      if (file.exists) {
        file.delete();
      }
      file.create();

      const header = createWavHeader(totalBytes);
      const body = new Uint8Array(totalBytes);
      let offset = 0;
      for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
      }
      const wav = new Uint8Array(header.byteLength + body.byteLength);
      wav.set(header, 0);
      wav.set(body, header.byteLength);
      file.write(wav);
      chunks.length = 0;
      return file.uri;
    },
    discard() {
      discarded = true;
      chunks.length = 0;
      totalBytes = 0;
      level = 0;
    },
  };
}

export const WAV_CAPTURE = {
  sampleRate: SAMPLE_RATE,
  channels: CHANNELS,
  bitsPerSample: BITS_PER_SAMPLE,
  mimeType: 'audio/wav',
} as const;
