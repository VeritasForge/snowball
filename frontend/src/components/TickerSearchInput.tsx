"use client";

import { useRef, useEffect, useId } from 'react';
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
  const inputRef = useRef<HTMLInputElement>(null);
  // Roving focus: DOM is the source of truth for the active option, so we move
  // focus imperatively in key handlers rather than mirroring it in React state.
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  // Unique ids per instance so multiple AssetRows don't collide on listbox/option ids.
  const uid = useId();
  const listboxId = `${uid}-listbox`;
  const { results, hasSearched, search, clearResults } = useTickerSearch({ onError });

  // Trigger autocomplete search whenever value prop changes
  useEffect(() => {
    search(value);
  }, [value, search]);

  // Click-outside closes the dropdown. Escape is owned by the input/option
  // onKeyDown handlers (which also restore focus), so no document keyup listener
  // here — that avoids double-clearResults and cross-instance crosstalk.
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        clearResults();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    /* v8 ignore next */
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [clearResults]);

  const handleSelect = (item: TickerSearchResult) => {
    // Restore focus to the input before clearResults unmounts the focused
    // option button, otherwise focus falls back to <body>.
    inputRef.current?.focus();
    onSelect(item.code, item.name);
    clearResults();
  };

  // Close the dropdown when focus leaves the container entirely (e.g. Tab out).
  // Internal focus moves (input <-> options) keep relatedTarget inside the
  // container, so they don't close it.
  const handleBlur = (e: React.FocusEvent) => {
    if (!containerRef.current?.contains(e.relatedTarget as Node | null)) {
      clearResults();
    }
  };

  // Input keys: ArrowDown enters the dropdown; Enter keeps the existing lookup.
  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    const hasOptions = hasSearched && results.length > 0;
    if (hasOptions && e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[0]?.focus();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      clearResults();
      onSearch();
    }
    if (e.key === 'Escape') clearResults();
  };

  // Option keys: roving focus between items, select, or return to the input.
  const handleOptionKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      itemRefs.current[Math.min(index + 1, results.length - 1)]?.focus();
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (index === 0) {
        inputRef.current?.focus();
      } else {
        itemRefs.current[index - 1]?.focus();
      }
      return;
    }
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      handleSelect(results[index]);
      return;
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      inputRef.current?.focus();
      clearResults();
    }
  };

  // Keep the ref array length in sync with results so shrinking result sets
  // don't leave stale detached-node pointers in higher slots.
  itemRefs.current.length = results.length;

  const showDropdown = hasSearched;

  return (
    <div ref={containerRef} onBlur={handleBlur} className="relative">
      <div className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleInputKeyDown}
          disabled={disabled}
          role="combobox"
          aria-expanded={showDropdown}
          aria-controls={listboxId}
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
          id={listboxId}
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
                  id={`${uid}-option-${index}`}
                  aria-selected={false}
                  tabIndex={-1}
                  ref={(el) => { itemRefs.current[index] = el; }}
                  onKeyDown={(e) => handleOptionKeyDown(e, index)}
                  onClick={() => handleSelect(item)}
                  className="w-full text-left px-3 py-2 text-xs transition-colors hover:bg-secondary focus:bg-secondary focus:outline-none"
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
