"use client";

import { useRef, useEffect, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { useTickerSearch, TickerSearchResult } from '../lib/hooks/useTickerSearch';

interface TickerSearchInputProps {
  value: string;
  onChange: (value: string) => void;
  onSelect: (code: string, name: string) => void;
  onSearch: () => void;
  onError: (message: string) => void;
  isLoading: boolean;
  disabled?: boolean;
}

export function TickerSearchInput({
  value, onChange, onSelect, onSearch, onError, isLoading, disabled,
}: TickerSearchInputProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { results, hasSearched, search, clearResults } = useTickerSearch({ onError });
  // -1 = no keyboard highlight; otherwise index of the active dropdown option.
  const [activeIndex, setActiveIndex] = useState(-1);

  // Trigger autocomplete search whenever value prop changes
  useEffect(() => {
    search(value);
  }, [value, search]);

  // Reset the keyboard highlight whenever the result set changes.
  useEffect(() => {
    setActiveIndex(-1);
  }, [results]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearResults();
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Escape') clearResults();
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keyup', handleKeyUp);
    /* v8 ignore next */
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [clearResults]);

  const handleSelect = (item: TickerSearchResult) => {
    onSelect(item.code, item.name);
    clearResults();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const hasOptions = hasSearched && results.length > 0;
    if (hasOptions && e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
      return;
    }
    if (hasOptions && e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
      return;
    }
    if (hasOptions && e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      handleSelect(results[activeIndex]);
      return;
    }
    if (e.key === 'Enter') {
      clearResults();
      onSearch();
    }
    if (e.key === 'Escape') clearResults();
  };

  const showDropdown = hasSearched;

  return (
    <div ref={containerRef} className="relative">
      <div className="flex items-center gap-1">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls="ticker-search-listbox"
          aria-activedescendant={activeIndex >= 0 ? `ticker-option-${activeIndex}` : undefined}
          aria-label="종목 코드 또는 이름 검색"
          className="w-20 text-[10px] text-muted border-b border-transparent focus:border-primary outline-none bg-transparent font-mono"
          placeholder="CODE / 종목명"
        />
        <button
          onClick={() => { clearResults(); onSearch(); }}
          disabled={isLoading}
          aria-label="종목 정보 조회"
          className="text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
        </button>
      </div>

      {showDropdown ? (
        <ul
          id="ticker-search-listbox"
          role="listbox"
          aria-label="종목 검색 결과"
          className="absolute top-full left-0 z-50 mt-1 min-w-[180px] bg-card border border-border rounded-lg shadow-lg overflow-hidden"
        >
          {results.length === 0 ? (
            <li className="px-3 py-2 text-xs text-muted">검색 결과 없음</li>
          ) : (
            results.map((item, index) => (
              <li key={item.code}>
                <button
                  role="option"
                  id={`ticker-option-${index}`}
                  aria-selected={index === activeIndex}
                  onClick={() => handleSelect(item)}
                  className={`w-full text-left px-3 py-2 text-xs transition-colors ${
                    index === activeIndex ? 'bg-secondary' : 'hover:bg-secondary'
                  }`}
                >
                  <span className="font-bold text-foreground">{item.name}</span>
                  <span className="text-muted ml-2">{item.code}</span>
                  <span className="text-muted ml-1 text-[10px]">{item.market}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      ) : null}
    </div>
  );
}
