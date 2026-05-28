import { useEffect, useRef, useState } from 'react';

/**
 * Animates the displayed numeric value toward `end` over `duration` ms with ease-out cubic.
 *
 * - `start` is the INITIAL display value on first render only. Subsequent updates of
 *   `end` animate FROM THE CURRENT DISPLAYED VALUE to the new `end` — this prevents
 *   reset-to-start flicker when data is refreshed (e.g., polling every 10s).
 * - Returns `end` immediately if current value == end, duration<=0, or `end` is non-finite
 *   (NaN/Infinity). Non-finite `start` is treated as 0 for the initial display.
 * - Honors `prefers-reduced-motion` by snapping to `end` immediately.
 * - setInterval-based (16ms cadence) — chosen for vitest fake-timer compatibility.
 *   Trade-off: no pause on background tabs, fixed cadence regardless of refresh rate.
 *   Cleans up the interval on unmount or when `end`/`duration` change.
 */
export function useCountUp(start: number, end: number, duration: number = 600): number {
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeEnd = Number.isFinite(end) ? end : 0;

  const [value, setValue] = useState<number>(safeStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track the latest displayed value so subsequent `end` updates animate from
  // current value (not from `start`), avoiding flicker on data refresh.
  const valueRef = useRef<number>(safeStart);
  valueRef.current = value;

  useEffect(() => {
    const fromValue = valueRef.current;

    if (duration <= 0 || fromValue === safeEnd) {
      setValue(safeEnd);
      return;
    }

    // Respect reduced-motion
    const reduced =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reduced) {
      setValue(safeEnd);
      return;
    }

    const frameMs = 16;
    // Use floor so the final frame fires within duration ms (vi.advanceTimersByTime compatible)
    const totalFrames = Math.floor(duration / frameMs);
    let frame = 0;
    const delta = safeEnd - fromValue;

    intervalRef.current = setInterval(() => {
      frame += 1;
      if (frame >= totalFrames) {
        // Final frame: snap to exact end value
        setValue(safeEnd);
        if (intervalRef.current != null) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        const t = frame / totalFrames;
        const eased = 1 - Math.pow(1 - t, 3);
        setValue(Math.round(fromValue + delta * eased));
      }
    }, frameMs);

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
    // Note: `safeStart` intentionally omitted from deps — `start` is only used
    // for the initial display value; subsequent renders animate from valueRef.
  }, [safeEnd, duration]);

  return value;
}
