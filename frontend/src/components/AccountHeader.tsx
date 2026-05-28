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
              aria-label="계좌명 입력"
              onChange={(e) => onTempNameChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.nativeEvent.isComposing) onConfirmEdit();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="text-xl font-bold border-b-2 border-accent outline-none bg-transparent text-foreground"
              autoFocus
            />
            <button onClick={onConfirmEdit} aria-label="계좌명 변경 확인" className="p-1 text-success"><Check size={20} /></button>
            <button onClick={onCancelEdit} aria-label="계좌명 편집 취소" className="p-1 text-muted hover:text-foreground"><X size={20} /></button>
          </div>
        ) : (
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            {account.name} 현황
            <button onClick={onStartEditing} aria-label="계좌명 편집" className="text-muted hover:text-foreground">
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
