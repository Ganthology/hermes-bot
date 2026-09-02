/**
 * whisper.rn's package.json `exports` omit the package root (only `./*`),
 * so TypeScript cannot resolve `import 'whisper.rn'`. This shim re-exports
 * the published typings for the APIs Hermes Bot uses.
 */
declare module 'whisper.rn' {
  export type TranscribeResult = {
    result: string;
    language: string;
    segments: { text: string; t0: number; t1: number }[];
    isAborted: boolean;
  };

  export type TranscribeFileOptions = {
    language?: string;
    translate?: boolean;
    maxThreads?: number;
    onProgress?: (progress: number) => void;
  };

  export type ContextOptions = {
    filePath: string | number;
    isBundleAsset?: boolean;
    useCoreMLIos?: boolean;
    useGpu?: boolean;
    useFlashAttn?: boolean;
  };

  export class WhisperContext {
    ptr: number;
    id: number;
    gpu: boolean;
    reasonNoGPU: string;
    transcribe(
      filePathOrBase64: string | number,
      options?: TranscribeFileOptions,
    ): {
      stop: () => Promise<void>;
      promise: Promise<TranscribeResult>;
    };
    release(): Promise<void>;
  }

  export function initWhisper(options: ContextOptions): Promise<WhisperContext>;
  export function releaseAllWhisper(): Promise<void>;
  export const libVersion: string;
}
