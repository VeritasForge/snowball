import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTickerSearch } from '../../src/lib/hooks/useTickerSearch';

const originalFetch = global.fetch;

describe('useTickerSearch', () => {
  let onError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    onError = vi.fn();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  // [Happy] Korean input >= 2 chars → fetch called after debounce → results set
  it('[Happy] 한글 입력 2자 이상 → debounce 후 fetch 호출 → 결과 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    expect(global.fetch).not.toHaveBeenCalled(); // debounce 전

    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/finance/search?q=%EC%82%BC%EC%84%B1')
    );
    expect(result.current.results).toEqual([
      { name: '삼성전자', code: '005930', market: 'KOSPI' },
    ]);
    expect(result.current.hasSearched).toBe(true);
  });

  // [Boundary] 1자 입력 → fetch 미호출
  it('[Boundary] 1자 입력 → fetch 미호출, results 빈 배열', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] 숫자만 입력 → fetch 미호출
  it('[Boundary] 숫자 입력 → fetch 미호출', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('005930'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] 빈 문자열 → fetch 미호출
  it('[Boundary] 빈 문자열 → fetch 미호출', async () => {
    global.fetch = vi.fn();
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search(''); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  // [Boundary] 검색 결과 0개 → hasSearched=true, results=[]
  it('[Boundary] 검색 결과 0개 → hasSearched=true, results=[]', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('없는종목이름'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(true);
    expect(onError).not.toHaveBeenCalled();
  });

  // [Error] fetch returns !ok → onError 호출, hasSearched=false
  it('[Error] fetch 응답 ok=false → onError 호출', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성전자'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(onError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Error] fetch throws → onError 호출
  it('[Error] fetch 예외 발생 → onError 호출', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성전자'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(onError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] clearResults → results=[], hasSearched=false
  it('[Boundary] clearResults → 상태 초기화', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: 'KOSPI' }],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    expect(result.current.results.length).toBe(1);

    act(() => { result.current.clearResults(); });
    expect(result.current.results).toEqual([]);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] 연속 빠른 입력 → 마지막 입력만 fetch 호출
  it('[Boundary] 연속 입력 → 마지막 입력만 fetch 호출', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼'); }); // 1자라 실제론 fetch 안 함
    act(() => { result.current.search('삼성'); });
    act(() => { result.current.search('삼성전'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).toHaveBeenCalledTimes(1);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('%EC%82%BC%EC%84%B1%EC%A0%84')
    );
  });
});
