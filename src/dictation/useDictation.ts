import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  RecordingPresets,
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioRecorder,
  useAudioRecorderState,
} from 'expo-audio';

import { toDictationError, humanDictationMessage } from './errors';
import {
  hydrateDictationPreference,
  resolveDictationProvider,
} from './resolveProvider';
import { DictationError, type DictationPhase, type DictationProvider } from './types';

const MIN_DURATION_MS = 400;

const RECORDING_OPTIONS = {
  ...RecordingPresets.HIGH_QUALITY,
  isMeteringEnabled: true,
};

export type MicPermission = 'unknown' | 'granted' | 'denied';

export type UseDictationResult = {
  phase: DictationPhase;
  /** Normalized 0–1 level while recording; 0 otherwise. */
  level: number;
  permission: MicPermission;
  /** Why the mic control is disabled/hidden, or null when usable. */
  blockedReason: string | null;
  error: string | null;
  clearError: () => void;
  providerLabel: string;
  start: () => Promise<void>;
  stop: () => Promise<void>;
  cancel: () => Promise<void>;
};

function normalizeMetering(metering: number | undefined): number {
  if (typeof metering !== 'number' || Number.isNaN(metering)) {
    return 0;
  }
  // iOS dBFS roughly −160…0; clamp into a usable UI range.
  const clamped = Math.min(0, Math.max(-60, metering));
  return (clamped + 60) / 60;
}

/**
 * Tap-to-record dictation. On stop, transcribes then calls `onTranscript`
 * so the composer can send immediately (same path as Send).
 */
export function useDictation(options: {
  onTranscript: (text: string) => Promise<void> | void;
  disabled?: boolean;
}): UseDictationResult {
  const { onTranscript, disabled = false } = options;
  const [provider, setProvider] = useState<DictationProvider>(() => resolveDictationProvider());
  const recorder = useAudioRecorder(RECORDING_OPTIONS);
  const recorderState = useAudioRecorderState(recorder, 80);

  const [phase, setPhase] = useState<DictationPhase>('idle');
  const [permission, setPermission] = useState<MicPermission>('unknown');
  const [error, setError] = useState<string | null>(null);

  const startedAtRef = useRef(0);
  const cancelRequestedRef = useRef(false);
  const busyRef = useRef(false);
  const onTranscriptRef = useRef(onTranscript);
  onTranscriptRef.current = onTranscript;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await hydrateDictationPreference();
        if (!cancelled) {
          setProvider(resolveDictationProvider());
        }
      } catch {
        // Keep the sync default (stub / unavailable) if Secure Store fails.
      }
      try {
        const status = await getRecordingPermissionsAsync();
        if (!cancelled) {
          setPermission(status.granted ? 'granted' : status.canAskAgain === false ? 'denied' : 'unknown');
        }
      } catch {
        if (!cancelled) {
          setPermission('unknown');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const clearError = useCallback(() => setError(null), []);

  const ensurePermission = useCallback(async (): Promise<boolean> => {
    const current = await getRecordingPermissionsAsync();
    if (current.granted) {
      setPermission('granted');
      return true;
    }
    const next = await requestRecordingPermissionsAsync();
    if (next.granted) {
      setPermission('granted');
      return true;
    }
    setPermission('denied');
    setError(humanDictationMessage('permission'));
    return false;
  }, []);

  const discardRecording = useCallback(async () => {
    try {
      if (recorder.isRecording) {
        await recorder.stop();
      }
    } catch {
      // Best-effort discard.
    }
  }, [recorder]);

  const start = useCallback(async () => {
    if (busyRef.current || disabled || phase !== 'idle') {
      return;
    }
    setError(null);
    cancelRequestedRef.current = false;
    busyRef.current = true;
    try {
      const ok = await ensurePermission();
      if (!ok) {
        return;
      }
      await setAudioModeAsync({
        allowsRecording: true,
        playsInSilentMode: true,
      });
      await recorder.prepareToRecordAsync();
      recorder.record();
      startedAtRef.current = Date.now();
      setPhase('recording');
    } catch (err) {
      const mapped = toDictationError(err);
      setError(humanDictationMessage(mapped.code, mapped.message));
      setPhase('idle');
    } finally {
      busyRef.current = false;
    }
  }, [disabled, ensurePermission, phase, recorder]);

  const cancel = useCallback(async () => {
    if (phase !== 'recording') {
      return;
    }
    cancelRequestedRef.current = true;
    busyRef.current = true;
    try {
      await discardRecording();
    } finally {
      setPhase('idle');
      busyRef.current = false;
    }
  }, [discardRecording, phase]);

  const stop = useCallback(async () => {
    if (busyRef.current || phase !== 'recording') {
      return;
    }
    busyRef.current = true;
    cancelRequestedRef.current = false;
    try {
      const elapsed = Date.now() - startedAtRef.current;
      await recorder.stop();
      const uri = recorder.uri;

      if (cancelRequestedRef.current) {
        setPhase('idle');
        return;
      }

      if (elapsed < MIN_DURATION_MS) {
        throw new DictationError('too_short', humanDictationMessage('too_short'));
      }
      if (!uri) {
        throw new DictationError('failed', humanDictationMessage('failed'));
      }

      setPhase('transcribing');
      const text = (await provider.transcribe({ kind: 'uri', uri })).trim();
      if (cancelRequestedRef.current) {
        setPhase('idle');
        return;
      }
      if (!text) {
        throw new DictationError('failed', humanDictationMessage('failed'));
      }

      setPhase('idle');
      await onTranscriptRef.current(text);
    } catch (err) {
      const mapped = toDictationError(err);
      if (mapped.code !== 'cancelled') {
        setError(humanDictationMessage(mapped.code, mapped.message));
      }
      setPhase('idle');
    } finally {
      busyRef.current = false;
    }
  }, [phase, provider, recorder]);

  const blockedReason = useMemo(() => {
    if (disabled) {
      return 'Chat is not ready for dictation yet.';
    }
    if (permission === 'denied') {
      return humanDictationMessage('permission');
    }
    return null;
  }, [disabled, permission]);

  const level =
    phase === 'recording' ? normalizeMetering(recorderState.metering) : 0;

  return {
    phase,
    level,
    permission,
    blockedReason,
    error,
    clearError,
    providerLabel: provider.label,
    start,
    stop,
    cancel,
  };
}
