"use client";

import { useState } from 'react';
import { Activity, Wallet } from 'lucide-react';

export const CATEGORIES = [
  { label: '주식', value: '주식', color: 'bg-danger', icon: Activity },
  { label: '채권', value: '채권', color: 'bg-primary', icon: Activity },
  { label: '원자재', value: '원자재', color: 'bg-warning', icon: Activity },
  { label: '현금', value: '현금', color: 'bg-success', icon: Wallet },
  { label: '기타', value: '기타', color: 'bg-muted', icon: Activity },
];

interface CategorySelectorProps {
  current: string;
  onSelect: (val: string) => void;
}

export function CategorySelector({ current, onSelect }: CategorySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const currentCat = CATEGORIES.find(c => c.value === current) || CATEGORIES[0];

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-8 h-8 rounded-full ${currentCat.color} flex items-center justify-center text-white shadow-sm hover:scale-110 transition-transform`}
        title={`카테고리: ${currentCat.label}`}
      >
        <span className="text-[10px] font-bold">{currentCat.label[0]}</span>
      </button>
      {isOpen && (
        <div className="absolute top-10 left-0 z-50 bg-card border border-border rounded-xl shadow-2xl w-36 py-2">
          {CATEGORIES.map(cat => (
            <button
              key={cat.value}
              onClick={() => { onSelect(cat.value); setIsOpen(false); }}
              className="flex items-center gap-3 px-3 py-2 hover:bg-secondary text-sm text-left w-full transition-colors"
            >
              <span className={`w-6 h-6 rounded-full ${cat.color} flex items-center justify-center text-white`} />
              <span className={current === cat.value ? 'font-bold text-foreground' : 'text-muted'}>
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
