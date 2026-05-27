import { useState, useEffect, useRef, useCallback } from 'react';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';
// Suppress autocomplete for pure-numeric input: numeric codes use the lookup endpoint.
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
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Read the latest onError via a ref so `search` stays referentially stable
  // even when the parent passes a new inline callback on every render.
  const onErrorRef = useRef(onError);
  useEffect(() => {
    onErrorRef.current = onError;
  });

  // Cancel any pending debounce timer and abort any in-flight request. Used on
  // dismiss (clearResults) and unmount so a queued/slow request can't reopen a
  // dropdown the user already closed or setState after unmount.
  const cancelPending = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    abortRef.current?.abort();
  }, []);

  const search = useCallback((query: string) => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!NAME_QUERY_RE.test(query) || query.length < MIN_QUERY_LENGTH) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    timerRef.current = setTimeout(async () => {
      // Cancel any in-flight request so a slow earlier response can't overwrite
      // the latest one (race condition guard).
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(
          `${API_URL}/finance/search?q=${encodeURIComponent(query)}`,
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error('Search failed');
        const data: TickerSearchResult[] = await res.json();
        setResults(data);
        setHasSearched(true);
      } catch (e) {
        if ((e as Error).name === 'AbortError') return; // superseded → ignore
        onErrorRef.current('종목 검색에 실패했습니다.');
        setResults([]);
        setHasSearched(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  const clearResults = useCallback(() => {
    cancelPending();
    setResults([]);
    setHasSearched(false);
  }, [cancelPending]);

  useEffect(() => {
    return () => { cancelPending(); };
  }, [cancelPending]);

  return { results, hasSearched, search, clearResults };
}
