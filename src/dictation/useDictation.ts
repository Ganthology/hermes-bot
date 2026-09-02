import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  getRecordingPermissionsAsync,
  requestRecordingPermissionsAsync,
  setAudioModeAsync,
  useAudioStream,
} from 'expo-audio';

import { toDictationError, humanDictationMessage } from './errors';
import {
  hydrateDictationPreference,
  resolveDictationProvider,
} from './resolveProvider';
import { DictationError, type DictationPhase, type DictationProvider } from './types';
import { startWavCapture, WAV_CAPTURE, type WavCaptureSession } from './wavCapture';

const MIN_DURATION_MS = 400;

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

/**
 * Tap-to-record dictation. Captures 16 kHz mono PCM → WAV (works for cloud + on-device Whisper).
 * On stop, transcribes then calls `onTranscript` so the composer can send immediately.
 */
export function useDictation(options: {
  onTranscript: (text: string) => Promise<void> | void;
  disabled?: boolean;
}): UseDictationResult {
  const { onTranscript, disabled = false } = options;
  const [provider, setProvider] = useState<DictationProvider>(() => resolveDictationProvider());

  const captureRef = useRef<WavCaptureSession | null>(null);
  const [level, setLevel] = useState(0);

  const { stream } = useAudioStream({
    sampleRate: WAV_CAPTURE.sampleRate,
    channels: WAV_CAPTURE.channels,
    encoding: 'int16',
    onBuffer: (buffer) => {
      const capture = captureRef.current;
      if (!capture) {
        return;
      }
      capture.append(buffer.data);
      setLevel(capture.lastLevel());
    },
  });

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
      captureRef.current?.discard();
      captureRef.current = null;
      try {
        stream.stop();
      } catch {
        // Stream may already be stopped.
      }
    };
  }, [stream]);

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

  const discardRecording = useCallback(() => {
    captureRef.current?.discard();
    captureRef.current = null;
    setLevel(0);
    try {
      stream.stop();
    } catch {
      // Best-effort discard.
    }
  }, [stream]);

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
      captureRef.current?.discard();
      captureRef.current = startWavCapture();
      setLevel(0);
      await stream.start();
      startedAtRef.current = Date.now();
      setPhase('recording');
    } catch (err) {
      discardRecording();
      const mapped = toDictationError(err);
      setError(humanDictationMessage(mapped.code, mapped.message));
      setPhase('idle');
    } finally {
      busyRef.current = false;
    }
  }, [disabled, discardRecording, ensurePermission, phase, stream]);

  const cancel = useCallback(async () => {
    if (phase !== 'recording') {
      return;
    }
    cancelRequestedRef.current = true;
    busyRef.current = true;
    try {
      discardRecording();
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
      const capture = captureRef.current;
      try {
        stream.stop();
      } catch {
        // Continue — we may still have PCM buffers.
      }

      if (cancelRequestedRef.current || !capture) {
        capture?.discard();
        captureRef.current = null;
        setLevel(0);
        setPhase('idle');
        return;
      }

      if (elapsed < MIN_DURATION_MS) {
        capture.discard();
        captureRef.current = null;
        setLevel(0);
        throw new DictationError('too_short', humanDictationMessage('too_short'));
      }

      const uri = await capture.finalize();
      captureRef.current = null;
      setLevel(0);

      setPhase('transcribing');
      const text = (
        await provider.transcribe(
          { kind: 'uri', uri },
          { mimeType: WAV_CAPTURE.mimeType },
        )
      ).trim();
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
      captureRef.current?.discard();
      captureRef.current = null;
      setLevel(0);
      const mapped = toDictationError(err);
      if (mapped.code !== 'cancelled') {
        setError(humanDictationMessage(mapped.code, mapped.message));
      }
      setPhase('idle');
    } finally {
      busyRef.current = false;
    }
  }, [phase, provider, stream]);

  const blockedReason = useMemo(() => {
    if (disabled) {
      return 'Chat is not ready for dictation yet.';
    }
    if (permission === 'denied') {
      return humanDictationMessage('permission');
    }
    return null;
  }, [disabled, permission]);

  return {
    phase,
    level: phase === 'recording' ? level : 0,
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
