import { useEffect, useRef, useState } from 'react';

/**
 * Animates a numeric value from `start` to `end` over `duration` ms with ease-out cubic.
 *
 * - Returns `end` immediately if start==end, duration<=0, or inputs are NaN.
 * - Honors prefers-reduced-motion by skipping interpolation (returns end immediately).
 * - Safe to call with rapidly changing `end` (cancels previous interval loop).
 */
export function useCountUp(start: number, end: number, duration: number = 600): number {
  const safeStart = Number.isFinite(start) ? start : 0;
  const safeEnd = Number.isFinite(end) ? end : 0;

  const [value, setValue] = useState<number>(safeStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (duration <= 0 || safeStart === safeEnd) {
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
    const delta = safeEnd - safeStart;

    // Reset to start before animating
    setValue(safeStart);

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
        setValue(Math.round(safeStart + delta * eased));
      }
    }, frameMs);

    return () => {
      if (intervalRef.current != null) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [safeStart, safeEnd, duration]);

  return value;
}
