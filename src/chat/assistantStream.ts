import { useEffect, useRef, useState } from 'react';

export function commonPrefixLength(left: string, right: string): number {
  const max = Math.min(left.length, right.length);
  let index = 0;
  while (index < max && left.charCodeAt(index) === right.charCodeAt(index)) {
    index += 1;
  }
  return index;
}

export function mergeAssistantContent(
  current: string,
  incoming: string,
  mode: 'append' | 'settle',
): string {
  if (!incoming) {
    return current;
  }
  if (!current) {
    return incoming;
  }
  if (incoming.startsWith(current)) {
    return incoming;
  }
  if (current.startsWith(incoming)) {
    return current;
  }
  if (mode === 'settle') {
    return current;
  }
  return current + incoming;
}

export function revealStep(remaining: number): number {
  if (remaining <= 8) {
    return 1;
  }
  if (remaining <= 24) {
    return 2;
  }
  if (remaining <= 80) {
    return 4;
  }
  return Math.min(16, Math.ceil(remaining / 20));
}

/** Grow `shown` toward `target` so dumped-complete text still paints like a stream. */
export function useRevealedText(
  target: string,
  enabled: boolean,
): { text: string; revealing: boolean } {
  const [text, setText] = useState(() => (enabled ? '' : target));
  const shownRef = useRef(enabled ? '' : target);

  useEffect(() => {
    if (!enabled) {
      shownRef.current = target;
      setText(target);
      return;
    }

    let timer: ReturnType<typeof setTimeout> | undefined;
    let cancelled = false;

    const pump = () => {
      if (cancelled) {
        return;
      }
      let shown = shownRef.current;
      if (!target.startsWith(shown)) {
        shown = target.slice(0, commonPrefixLength(shown, target));
      }
      if (shown.length >= target.length) {
        shownRef.current = target;
        setText(target);
        return;
      }
      const next = target.slice(0, shown.length + revealStep(target.length - shown.length));
      shownRef.current = next;
      setText(next);
      timer = setTimeout(pump, 16);
    };

    pump();
    return () => {
      cancelled = true;
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [enabled, target]);

  return {
    text,
    revealing: enabled && text !== target,
  };
}
