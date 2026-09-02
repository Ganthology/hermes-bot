/**
 * Whisper.cpp GGML models hosted on Hugging Face.
 * Downloaded on demand — never shipped in the app binary / git.
 */

export type OnDeviceModelId = 'tiny.en-q5_1' | 'base.en-q5_1' | 'small.en-q5_1';

export type OnDeviceModelMeta = {
  id: OnDeviceModelId;
  /** Hugging Face file name under ggerganov/whisper.cpp. */
  fileName: string;
  label: string;
  blurb: string;
  /** Approximate download size for Settings copy. */
  sizeLabel: string;
  /** Expected byte size (from HF) for post-download sanity check. */
  expectedBytes: number;
  /** Minimum acceptable size (guards truncated downloads). */
  minBytes: number;
};

const HF_BASE = 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main';

export const ON_DEVICE_MODELS: readonly OnDeviceModelMeta[] = [
  {
    id: 'tiny.en-q5_1',
    fileName: 'ggml-tiny.en-q5_1.bin',
    label: 'Tiny English (q5)',
    blurb: 'Fastest. Good for short English prompts on phone.',
    sizeLabel: '~31 MB',
    expectedBytes: 32_166_155,
    minBytes: 20_000_000,
  },
  {
    id: 'base.en-q5_1',
    fileName: 'ggml-base.en-q5_1.bin',
    label: 'Base English (q5)',
    blurb: 'Better accuracy, still phone-friendly.',
    sizeLabel: '~57 MB',
    expectedBytes: 59_721_011,
    minBytes: 40_000_000,
  },
  {
    id: 'small.en-q5_1',
    fileName: 'ggml-small.en-q5_1.bin',
    label: 'Small English (q5)',
    blurb: 'Higher quality. Needs more RAM and time.',
    sizeLabel: '~181 MB',
    expectedBytes: 190_098_681,
    minBytes: 120_000_000,
  },
] as const;

/** Default download target — small enough for most phones. */
export const DEFAULT_ON_DEVICE_MODEL_ID: OnDeviceModelId = 'tiny.en-q5_1';

export function onDeviceModelMeta(id: OnDeviceModelId): OnDeviceModelMeta {
  const found = ON_DEVICE_MODELS.find((m) => m.id === id);
  if (!found) {
    return ON_DEVICE_MODELS[0]!;
  }
  return found;
}

export function onDeviceModelDownloadUrl(id: OnDeviceModelId): string {
  return `${HF_BASE}/${onDeviceModelMeta(id).fileName}`;
}

export function parseOnDeviceModelId(raw: string | null | undefined): OnDeviceModelId {
  if (raw === 'base.en-q5_1' || raw === 'small.en-q5_1' || raw === 'tiny.en-q5_1') {
    return raw;
  }
  return DEFAULT_ON_DEVICE_MODEL_ID;
}
