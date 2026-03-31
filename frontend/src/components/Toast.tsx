"use client";

import { Check, X, AlertCircle } from 'lucide-react';

interface ToastProps {
  message: string;
  type: 'info' | 'error';
  onClose: () => void;
}

export function Toast({ message, type, onClose }: ToastProps) {
  if (!message) return null;
  const bgClass = type === 'error' ? 'bg-danger' : 'bg-primary';
  return (
    <div className={`fixed top-4 left-1/2 transform -translate-x-1/2 ${bgClass} text-primary-foreground px-4 py-2 rounded-full shadow-lg flex items-center gap-2 z-50 animate-bounce-in`}>
      {type === 'error' ? <AlertCircle size={16} /> : <Check size={16} />}
      <span className="text-sm font-medium">{message}</span>
      <button onClick={onClose} className="ml-2 hover:bg-white/20 rounded-full p-0.5">
        <X size={14} />
      </button>
    </div>
  );
}
