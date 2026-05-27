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
      expect.stringContaining('/finance/search?q=%EC%82%BC%EC%84%B1'),
      expect.anything()
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
      expect.stringContaining('%EC%82%BC%EC%84%B1%EC%A0%84'),
      expect.anything()
    );
  });

  // [Boundary] onError가 매 렌더 새 함수여도 search 참조는 안정적이다 (advanced-use-latest)
  it('[Boundary] onError가 바뀌어도 search 참조가 안정적이다', () => {
    const { result, rerender } = renderHook(
      ({ onError }: { onError: (message: string) => void }) => useTickerSearch({ onError }),
      { initialProps: { onError: vi.fn() } }
    );
    const firstSearch = result.current.search;

    rerender({ onError: vi.fn() }); // 부모 리렌더로 새 onError 전달

    expect(result.current.search).toBe(firstSearch);
  });

  // [Boundary] search는 최신 onError를 호출한다 (ref가 갱신됨)
  it('[Boundary] search는 항상 최신 onError를 호출한다', async () => {
    const firstError = vi.fn();
    const secondError = vi.fn();
    global.fetch = vi.fn().mockResolvedValue({ ok: false });
    const { result, rerender } = renderHook(
      ({ onError }: { onError: (message: string) => void }) => useTickerSearch({ onError }),
      { initialProps: { onError: firstError } }
    );

    rerender({ onError: secondError });
    act(() => { result.current.search('삼성전자'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(secondError).toHaveBeenCalledWith('종목 검색에 실패했습니다.');
    expect(firstError).not.toHaveBeenCalled();
  });

  // [Boundary] 취소된 요청(AbortError)은 onError를 호출하지 않는다 (race 방어)
  it('[Boundary] 요청 취소(AbortError) 시 onError 미호출', async () => {
    const abortErr = new Error('aborted');
    abortErr.name = 'AbortError';
    global.fetch = vi.fn().mockRejectedValue(abortErr);
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성전자'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(onError).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] debounce를 넘어선 후속 검색은 이전 in-flight 요청을 abort한다
  it('[Boundary] 후속 검색이 이전 요청 signal을 abort한다', async () => {
    const signals: AbortSignal[] = [];
    global.fetch = vi.fn().mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
      signals.push(opts.signal);
      return new Promise(() => {}); // never resolves → in-flight 유지
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    act(() => { result.current.search('카카오'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(signals.length).toBe(2);
    expect(signals[0].aborted).toBe(true);  // 이전 요청은 취소됨
    expect(signals[1].aborted).toBe(false); // 최신 요청은 살아있음
  });

  // [Boundary] clearResults는 대기 중인 debounce 타이머를 취소해 닫은 드롭다운 재오픈을 막는다
  it('[Boundary] clearResults 후 대기 타이머가 fetch를 발사하지 않는다', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [{ name: '삼성전자', code: '005930', market: '코스피' }],
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });   // 타이머 예약
    act(() => { result.current.clearResults(); });    // debounce 전에 dismiss
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });

    expect(global.fetch).not.toHaveBeenCalled();
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] in-flight fetch 중 clearResults → 요청을 abort하고 결과를 반영하지 않는다
  it('[Boundary] clearResults가 in-flight 요청을 abort한다', async () => {
    let captured: AbortSignal | undefined;
    global.fetch = vi.fn().mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
      captured = opts.signal;
      return new Promise(() => {}); // never resolves
    });
    const { result } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); }); // 타이머 발사 → fetch 시작
    act(() => { result.current.clearResults(); });

    expect(captured?.aborted).toBe(true);
    expect(result.current.hasSearched).toBe(false);
  });

  // [Boundary] unmount 시 in-flight 요청을 abort한다 (setState-after-unmount 방지)
  it('[Boundary] unmount가 in-flight 요청을 abort한다', async () => {
    let captured: AbortSignal | undefined;
    global.fetch = vi.fn().mockImplementation((_url: string, opts: { signal: AbortSignal }) => {
      captured = opts.signal;
      return new Promise(() => {});
    });
    const { result, unmount } = renderHook(() => useTickerSearch({ onError }));

    act(() => { result.current.search('삼성'); });
    await act(async () => { await new Promise(r => setTimeout(r, 350)); });
    unmount();

    expect(captured?.aborted).toBe(true);
  });
});
