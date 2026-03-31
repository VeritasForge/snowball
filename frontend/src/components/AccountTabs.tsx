"use client";

import { Plus, Wallet, Check, X } from 'lucide-react';
import { Account } from '../types';

interface AccountTabsProps {
  accounts: Account[];
  activeAccountId: number | null;
  isGuest: boolean;
  isAddingAccount: boolean;
  newAccountName: string;
  isSubmitting: boolean;
  onSelectAccount: (id: number) => void;
  onStartAdding: () => void;
  onCancelAdding: () => void;
  onNameChange: (name: string) => void;
  onCreateAccount: () => void;
}

export function AccountTabs({
  accounts, activeAccountId, isGuest, isAddingAccount,
  newAccountName, isSubmitting, onSelectAccount, onStartAdding,
  onCancelAdding, onNameChange, onCreateAccount,
}: AccountTabsProps) {
  if (isGuest) return null;

  return (
    <div className="mb-6 flex flex-wrap items-center gap-2 overflow-x-auto pb-2">
      {accounts.map(acc => (
        <button
          key={acc.id}
          onClick={() => onSelectAccount(acc.id!)}
          className={`px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2 border transition-all ${
            activeAccountId === acc.id
              ? 'bg-secondary text-foreground shadow-md border-border'
              : 'bg-card text-muted hover:bg-secondary border-border'
          }`}
        >
          <Wallet size={14} /> {acc.name}
        </button>
      ))}
      {isAddingAccount ? (
        <div className="flex items-center gap-2 bg-card border border-primary rounded-full px-3 py-1 shadow-sm">
          <input
            type="text"
            value={newAccountName}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="계좌명"
            className="w-24 text-sm outline-none bg-transparent text-foreground"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.nativeEvent.isComposing) onCreateAccount();
              if (e.key === 'Escape') onCancelAdding();
            }}
          />
          <button onClick={onCreateAccount} disabled={isSubmitting} className="text-primary">
            <Check size={16} />
          </button>
          <button onClick={onCancelAdding} className="text-muted hover:text-foreground">
            <X size={16} />
          </button>
        </div>
      ) : (
        <button
          onClick={onStartAdding}
          className="px-3 py-2 rounded-full text-sm font-medium bg-primary/10 text-primary border border-primary/20 flex items-center gap-1 hover:bg-primary/20 transition-colors"
        >
          <Plus size={14} /> 계좌 추가
        </button>
      )}
    </div>
  );
}
