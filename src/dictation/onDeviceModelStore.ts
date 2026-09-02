/**
 * Download / delete Whisper GGML models in the app documents directory.
 * Progress is reported to Settings; binaries are never committed to git.
 */

import { Directory, File, Paths } from 'expo-file-system';
import type { DownloadTask } from 'expo-file-system';

import {
  onDeviceModelDownloadUrl,
  onDeviceModelMeta,
  type OnDeviceModelId,
} from './onDeviceModels';

export type ModelDownloadProgress = {
  modelId: OnDeviceModelId;
  bytesWritten: number;
  totalBytes: number;
  /** 0–1 when total is known; otherwise 0. */
  fraction: number;
};

export type ModelPresence = {
  modelId: OnDeviceModelId;
  present: boolean;
  bytes: number;
  path: string | null;
};

let activeTask: DownloadTask | null = null;
let activeModelId: OnDeviceModelId | null = null;

function modelsDirectory(): Directory {
  const dir = new Directory(Paths.document, 'whisper-models');
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

export function modelFile(modelId: OnDeviceModelId): File {
  const meta = onDeviceModelMeta(modelId);
  return new File(modelsDirectory(), meta.fileName);
}

export function getModelPath(modelId: OnDeviceModelId): string | null {
  const file = modelFile(modelId);
  if (!file.exists || file.size < onDeviceModelMeta(modelId).minBytes) {
    return null;
  }
  return file.uri;
}

export function getModelPresence(modelId: OnDeviceModelId): ModelPresence {
  const file = modelFile(modelId);
  const present = file.exists && file.size >= onDeviceModelMeta(modelId).minBytes;
  return {
    modelId,
    present,
    bytes: present ? file.size : 0,
    path: present ? file.uri : null,
  };
}

export function listModelPresence(): ModelPresence[] {
  return (['tiny.en-q5_1', 'base.en-q5_1', 'small.en-q5_1'] as OnDeviceModelId[]).map(
    getModelPresence,
  );
}

/**
 * Download a model with progress. Cancels any in-flight download first.
 * Rejects with a human-readable Error on failure.
 */
export async function downloadModel(
  modelId: OnDeviceModelId,
  onProgress?: (progress: ModelDownloadProgress) => void,
): Promise<string> {
  cancelModelDownload();

  const meta = onDeviceModelMeta(modelId);
  const destination = modelFile(modelId);
  if (destination.exists) {
    destination.delete();
  }

  const url = onDeviceModelDownloadUrl(modelId);
  const task = File.createDownloadTask(url, destination, {
    onProgress: ({ bytesWritten, totalBytes }) => {
      const total = totalBytes > 0 ? totalBytes : meta.expectedBytes;
      onProgress?.({
        modelId,
        bytesWritten,
        totalBytes: total,
        fraction: total > 0 ? Math.min(1, bytesWritten / total) : 0,
      });
    },
  });

  activeTask = task;
  activeModelId = modelId;

  try {
    const file = await task.downloadAsync();
    if (!file) {
      throw new Error('Model download was interrupted. Try again.');
    }
    if (!file.exists || file.size < meta.minBytes) {
      try {
        file.delete();
      } catch {
        // Best-effort cleanup of a truncated file.
      }
      throw new Error(
        `Download of ${meta.label} looked incomplete (${file.size} bytes). Check your connection and try again.`,
      );
    }
    return file.uri;
  } catch (error) {
    if (destination.exists) {
      try {
        destination.delete();
      } catch {
        // Ignore cleanup errors.
      }
    }
    if (error instanceof Error && /abort|cancel/i.test(error.message)) {
      throw new Error('Model download cancelled.');
    }
    if (error instanceof Error && error.message.trim()) {
      throw new Error(
        error.message.includes('Download') || error.message.includes('incomplete')
          ? error.message
          : `Could not download ${meta.label}. ${error.message}`,
      );
    }
    throw new Error(`Could not download ${meta.label}. Check your connection and try again.`);
  } finally {
    if (activeTask === task) {
      activeTask = null;
      activeModelId = null;
    }
    try {
      task.release();
    } catch {
      // Native handle may already be gone.
    }
  }
}

export function cancelModelDownload(): void {
  if (!activeTask) {
    return;
  }
  try {
    activeTask.cancel();
  } catch {
    // Already finished.
  }
  activeTask = null;
  activeModelId = null;
}

export function isModelDownloadActive(modelId?: OnDeviceModelId): boolean {
  if (!activeTask) {
    return false;
  }
  if (!modelId) {
    return true;
  }
  return activeModelId === modelId;
}

/** Delete a downloaded model binary from device storage. */
export function deleteModel(modelId: OnDeviceModelId): void {
  if (activeModelId === modelId) {
    cancelModelDownload();
  }
  const file = modelFile(modelId);
  if (file.exists) {
    file.delete();
  }
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
