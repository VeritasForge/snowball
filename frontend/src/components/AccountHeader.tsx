"use client";

import { Edit2, Check, X, Trash2 } from 'lucide-react';
import { Account } from '../types';

interface AccountHeaderProps {
  account: Account;
  isGuest: boolean;
  isEditingName: boolean;
  tempName: string;
  onStartEditing: () => void;
  onTempNameChange: (name: string) => void;
  onConfirmEdit: () => void;
  onCancelEdit: () => void;
  onDeleteAccount: () => void;
}

export function AccountHeader({
  account, isGuest, isEditingName, tempName,
  onStartEditing, onTempNameChange, onConfirmEdit, onCancelEdit, onDeleteAccount,
}: AccountHeaderProps) {
  return (
    <div className="flex justify-between items-end border-b border-border pb-2">
      <div className="flex items-center gap-2">
        {isEditingName ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={tempName}
              onChange={(e) => onTempNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) onConfirmEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="text-xl font-bold border-b-2 border-primary outline-none bg-transparent text-foreground"
              autoFocus
            />
            <button onClick={onConfirmEdit} className="p-1 text-success"><Check size={20} /></button>
            <button onClick={onCancelEdit} className="p-1 text-muted hover:text-foreground"><X size={20} /></button>
          </div>
        ) : (
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {account.name} 현황
            <button onClick={onStartEditing} className="text-muted hover:text-foreground">
              <Edit2 size={16} />
            </button>
          </h2>
        )}
      </div>
      {!isGuest && (
        <button onClick={onDeleteAccount} className="text-xs text-danger hover:text-red-600 underline flex items-center gap-1">
          <Trash2 size={12} /> 계좌 삭제
        </button>
      )}
    </div>
  );
}
