import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCountUp } from '../../src/lib/hooks/useCountUp';

describe('useCountUp', () => {
  beforeEach(() => { vi.useFakeTimers(); });
  afterEach(() => { vi.useRealTimers(); });

  // [Happy]
  it('[Happy] returns end value when duration elapses (positive)', () => {
    const { result } = renderHook(() => useCountUp(0, 1000, 600));
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(1000);
  });

  it('[Happy] returns end value when duration elapses (negative)', () => {
    const { result } = renderHook(() => useCountUp(0, -500, 600));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(-500);
  });

  // [Boundary]
  it('[Boundary] returns end immediately when start equals end', () => {
    const { result } = renderHook(() => useCountUp(42, 42, 600));
    expect(result.current).toBe(42);
  });

  it('[Boundary] returns end immediately when duration is 0', () => {
    const { result } = renderHook(() => useCountUp(0, 100, 0));
    expect(result.current).toBe(100);
  });

  it('[Boundary] handles large values (millions) without overflow', () => {
    const { result } = renderHook(() => useCountUp(0, 12_400_000, 600));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(12_400_000);
  });

  it('[Boundary] updates when end changes mid-animation', () => {
    const { result, rerender } = renderHook(({ end }) => useCountUp(0, end, 600), { initialProps: { end: 100 } });
    act(() => { vi.advanceTimersByTime(300); });
    rerender({ end: 200 });
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(200);
  });

  it('[Boundary] returns end immediately when prefers-reduced-motion is set', () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (query: string) => ({
      matches: query.includes('reduce'),
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    } as MediaQueryList);
    const { result } = renderHook(() => useCountUp(0, 500, 600));
    expect(result.current).toBe(500);
    window.matchMedia = originalMatchMedia;
  });

  // [Error] — 잘못된 입력 정책: NaN 인자는 안전 fallback
  it('[Error] falls back to end when start is NaN', () => {
    const { result } = renderHook(() => useCountUp(NaN, 100, 600));
    act(() => { vi.advanceTimersByTime(600); });
    expect(result.current).toBe(100);
  });

  it('[Error] falls back to 0 when end is NaN', () => {
    const { result } = renderHook(() => useCountUp(0, NaN, 600));
    expect(result.current).toBe(0);
  });
});
