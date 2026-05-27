import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
const NAME_QUERY_RE = /[가-힣a-zA-Z]/;
const MIN_QUERY_LENGTH = 2;
const DEBOUNCE_MS = 300;

export interface TickerSearchResult {
  name: string;
  code: string;
  market: string;
}

interface UseTickerSearchOptions {
  onError: (message: string) => void;
}

export function useTickerSearch({ onError }: UseTickerSearchOptions) {
  const [results, setResults] = useState<TickerSearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!NAME_QUERY_RE.test(query) || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`${API_URL}/finance/search?q=${encodeURIComponent(query)}`);
        if (!res.ok) throw new Error('Search failed');
        const data: TickerSearchResult[] = await res.json();
        setResults(data);
        setHasSearched(true);
      } catch {
        onError('종목 검색에 실패했습니다.');
        setResults([]);
        setHasSearched(false);
      } finally {
        setIsSearching(false);
      }
    }, DEBOUNCE_MS);
  }, [onError]);

  const clearResults = useCallback(() => {
    setResults([]);
    setHasSearched(false);
  }, []);

  useEffect(() => {
    /* v8 ignore next */
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  return { results, hasSearched, isSearching, search, clearResults };
}
