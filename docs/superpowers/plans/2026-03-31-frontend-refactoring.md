# Frontend Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 533줄 `page.tsx` God Component와 525줄 `usePortfolioData` God Hook을 Vercel React Best Practices(rerender-no-inline-components, rerender-split-combined-hooks, architecture-avoid-boolean-props) 기준으로 분해한다. **동작 변경 없음.**

**Architecture:** 4단계 순서로 진행 — 컴포넌트 분리 → 버그 수정 → 훅 분리 → 서비스 레이어. 각 단계마다 `npm test -- --run` 통과 확인 후 커밋.

**Tech Stack:** Next.js 16.1.1, React 19, TypeScript 5, Tailwind CSS v4, Zustand 5, Vitest

---

## File Map

| 작업 | 파일 | 역할 |
|------|------|------|
| 생성 | `src/components/Toast.tsx` | 알림 토스트 UI |
| 생성 | `src/components/CategorySelector.tsx` | 자산군 드롭다운 + CATEGORIES 상수 |
| 생성 | `src/components/AccountTabs.tsx` | 계좌 탭 바 + 계좌 추가 |
| 생성 | `src/components/AccountHeader.tsx` | 계좌명 편집 + 계좌 삭제 |
| 생성 | `src/components/AssetRow.tsx` | 자산 테이블 1행(tr) |
| 생성 | `src/components/AssetTable.tsx` | 자산 테이블 래퍼 |
| 생성 | `src/lib/utils.ts` | formatNumber 유틸 |
| 생성 | `src/lib/fetchWithAuth.ts` | 인증 fetch 래퍼 |
| 생성 | `src/lib/hooks/useAccounts.ts` | 계좌 목록 상태 + fetchAccounts |
| 생성 | `src/lib/hooks/useAssetActions.ts` | 자산 CRUD + 가격 조회 |
| 생성 | `src/lib/hooks/usePriceRefresh.ts` | updateAllPrices |
| 생성 | `src/lib/services/portfolioService.ts` | PortfolioService 인터페이스 + 공통 타입 |
| 생성 | `src/lib/services/guestPortfolioService.ts` | Zustand 기반 구현 |
| 생성 | `src/lib/services/authPortfolioService.ts` | API fetch 기반 구현 |
| 생성 | `.env.example` | 환경변수 예시 |
| 수정 | `src/app/page.tsx` | 100줄 이하 조립 코드 |
| 수정 | `src/app/layout.tsx` | metadata title 수정 |
| 수정 | `src/lib/hooks/usePortfolioData.ts` | 200줄 이하 조합 코드 |

---

## Task 1: 베이스라인 확립

**Files:** (없음)

- [ ] **Step 1: 현재 테스트 통과 상태 확인**

```bash
cd frontend && npm test -- --run
```

Expected: 전체 PASS (실패가 있으면 수정 후 진행)

- [ ] **Step 2: TypeScript 에러 확인**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

Expected: 에러 수 기록 (기준선)

---

## Task 2: Toast 컴포넌트 분리

**Files:**
- Create: `frontend/src/components/Toast.tsx`
- Modify: `frontend/src/app/page.tsx` (import 추가, 인라인 정의 제거)

- [ ] **Step 1: Toast.tsx 생성**

`frontend/src/components/Toast.tsx`:
```tsx
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
```

- [ ] **Step 2: page.tsx 수정** — 인라인 Toast 정의(24-34줄) 삭제, import 추가

`frontend/src/app/page.tsx` import 블록에 추가:
```tsx
import { Toast } from '../components/Toast';
```

page.tsx에서 아래 코드 삭제:
```tsx
const Toast = ({ message, type, onClose }: { message: string, type: 'info' | 'error', onClose: () => void }) => {
  ...
};
```

- [ ] **Step 3: 테스트 실행**

```bash
cd frontend && npm test -- --run
```

Expected: 전체 PASS

- [ ] **Step 4: 커밋**

```bash
cd frontend && git add src/components/Toast.tsx src/app/page.tsx
git commit -m "refactor(ui): extract Toast component"
```

---

## Task 3: CategorySelector 컴포넌트 분리

**Files:**
- Create: `frontend/src/components/CategorySelector.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: CategorySelector.tsx 생성**

`frontend/src/components/CategorySelector.tsx`:
```tsx
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
```

- [ ] **Step 2: page.tsx 수정** — 인라인 CategorySelector + CATEGORIES 삭제, import 추가

삭제 (page.tsx:16-69):
```tsx
const CATEGORIES = [ ... ];
const CategorySelector = (...) => { ... };
```

추가:
```tsx
import { CategorySelector } from '../components/CategorySelector';
```

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/components/CategorySelector.tsx src/app/page.tsx
git commit -m "refactor(ui): extract CategorySelector component"
```

---

## Task 4: AccountTabs 컴포넌트 분리

**Files:**
- Create: `frontend/src/components/AccountTabs.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: AccountTabs.tsx 생성**

`frontend/src/components/AccountTabs.tsx`:
```tsx
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
```

- [ ] **Step 2: page.tsx 수정** — AccountTabs JSX(261-281줄) 교체 + import 추가

```tsx
import { AccountTabs } from '../components/AccountTabs';
```

렌더 코드 교체:
```tsx
<AccountTabs
  accounts={accounts}
  activeAccountId={activeAccountId}
  isGuest={isGuest}
  isAddingAccount={isAddingAccount}
  newAccountName={newAccountName}
  isSubmitting={isSubmitting}
  onSelectAccount={setActiveAccountId}
  onStartAdding={() => setIsAddingAccount(true)}
  onCancelAdding={() => setIsAddingAccount(false)}
  onNameChange={setNewAccountName}
  onCreateAccount={handleCreateAccount}
/>
```

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/components/AccountTabs.tsx src/app/page.tsx
git commit -m "refactor(ui): extract AccountTabs component"
```

---

## Task 5: AccountHeader 컴포넌트 분리

**Files:**
- Create: `frontend/src/components/AccountHeader.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: AccountHeader.tsx 생성**

`frontend/src/components/AccountHeader.tsx`:
```tsx
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
```

- [ ] **Step 2: page.tsx 수정** — AccountHeader JSX(285-330줄) 교체 + import 추가

```tsx
import { AccountHeader } from '../components/AccountHeader';
```

렌더 코드 교체:
```tsx
<AccountHeader
  account={activeAccount}
  isGuest={isGuest}
  isEditingName={isEditingName}
  tempName={tempName}
  onStartEditing={() => { setTempName(activeAccount.name); setIsEditingName(true); }}
  onTempNameChange={setTempName}
  onConfirmEdit={() => { apiUpdateAccountName(activeAccount.id!, tempName); setIsEditingName(false); }}
  onCancelEdit={() => setIsEditingName(false)}
  onDeleteAccount={async () => {
    if (!confirm(`'${activeAccount.name}' 계좌를 삭제하시겠습니까?\n계좌에 포함된 모든 종목도 함께 삭제됩니다.`)) return;
    const res = await apiDeleteAccount(activeAccount.id);
    if (res.success) showToast(`'${activeAccount.name}' 계좌가 삭제되었습니다.`);
    else showToast(res.message || '계좌 삭제 실패', 'error');
  }}
/>
```

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/components/AccountHeader.tsx src/app/page.tsx
git commit -m "refactor(ui): extract AccountHeader component"
```

---

## Task 6: formatNumber 유틸 + AssetRow 분리

**Files:**
- Create: `frontend/src/lib/utils.ts`
- Create: `frontend/src/components/AssetRow.tsx`
- Modify: `frontend/src/app/page.tsx`

- [ ] **Step 1: utils.ts 생성**

`frontend/src/lib/utils.ts`:
```ts
export const formatNumber = (num: number): string =>
  Math.round(num).toLocaleString('ko-KR');
```

- [ ] **Step 2: AssetRow.tsx 생성**

`frontend/src/components/AssetRow.tsx`:
```tsx
"use client";

import { Loader2, Search, PlayCircle, Check, X, Trash2 } from 'lucide-react';
import { Asset } from '../types';
import { CategorySelector } from './CategorySelector';
import { NumberFormatInput } from './NumberFormatInput';
import { formatNumber } from '../lib/utils';

interface AssetRowProps {
  item: Asset;
  isGuest: boolean;
  loadingRowId: number | null;
  deleteConfirmId: number | null;
  executeConfirmId: number | null;
  totalTargetWeight: number;
  onUpdateAsset: (id: number, field: string, value: string | number) => void;
  onDeleteAsset: (id: number) => void;
  onExecuteTrade: (asset: Asset) => void;
  onFetchAssetInfo: (id: number, code: string) => void;
  onSetDeleteConfirmId: (id: number | null) => void;
  onSetExecuteConfirmId: (id: number | null) => void;
  showToast: (message: string, type?: 'info' | 'error') => void;
}

export function AssetRow({
  item, isGuest, loadingRowId, deleteConfirmId, executeConfirmId,
  totalTargetWeight, onUpdateAsset, onDeleteAsset, onExecuteTrade,
  onFetchAssetInfo, onSetDeleteConfirmId, onSetExecuteConfirmId, showToast,
}: AssetRowProps) {
  return (
    <tr className="hover:bg-secondary/30 transition-colors group">
      <td className="p-4 text-center align-middle">
        <CategorySelector
          current={item.category}
          onSelect={(val) => onUpdateAsset(item.id!, 'category', val)}
        />
      </td>
      <td className="p-4">
        <input
          type="text"
          value={item.name}
          onChange={(e) => onUpdateAsset(item.id!, 'name', e.target.value)}
          className="w-full font-bold text-foreground border-b border-transparent focus:border-primary outline-none bg-transparent"
          placeholder="종목명"
        />
        <div className="flex items-center gap-1 mt-1">
          <input
            type="text"
            value={item.code || ''}
            onChange={(e) => onUpdateAsset(item.id!, 'code', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && item.id && onFetchAssetInfo(item.id, item.code || '')}
            className="w-20 text-[10px] text-muted border-b border-transparent focus:border-primary outline-none bg-transparent font-mono"
            placeholder="CODE"
          />
          <button
            onClick={() => item.id && onFetchAssetInfo(item.id, item.code || '')}
            disabled={loadingRowId === item.id || !item.id}
            className="text-muted hover:text-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingRowId === item.id ? <Loader2 size={10} className="animate-spin" /> : <Search size={10} />}
          </button>
        </div>
      </td>
      <td className="p-4 text-center">
        <div className="flex items-center justify-center bg-secondary border border-border rounded-md px-2 py-1 shadow-sm w-20 mx-auto">
          <input
            type="number"
            step="0.1"
            value={isNaN(item.target_weight) ? '' : item.target_weight}
            onFocus={(e) => e.target.select()}
            onChange={(e) => {
              const newVal = parseFloat(e.target.value) || 0;
              const otherTotal = totalTargetWeight - (item.target_weight || 0);
              if (otherTotal + newVal > 100) {
                showToast(`목표비중 합계가 100%를 초과합니다 (${(otherTotal + newVal).toFixed(1)}%)`, 'error');
              }
              onUpdateAsset(item.id!, 'targetRatio', e.target.value);
            }}
            className="w-full text-center outline-none font-bold text-foreground bg-transparent"
          />
          <span className="text-muted text-[10px]">%</span>
        </div>
      </td>
      <td className="p-4 text-right">
        <NumberFormatInput
          value={item.avg_price || 0}
          onChange={(val) => onUpdateAsset(item.id!, 'avgPrice', val)}
          className="w-24 text-right border-b border-border focus:border-primary outline-none text-muted text-xs bg-transparent"
          placeholder="0"
        />
      </td>
      <td className="p-4 text-right">
        <NumberFormatInput
          value={item.current_price || 0}
          onChange={(val) => onUpdateAsset(item.id!, 'price', val)}
          className="w-24 text-right border-b border-border focus:border-primary outline-none font-bold text-foreground bg-transparent"
          placeholder="0"
        />
      </td>
      <td className="p-4 text-right">
        <NumberFormatInput
          value={item.quantity || 0}
          onChange={(val) => onUpdateAsset(item.id!, 'qty', val)}
          className="w-16 text-right border-b border-border focus:border-primary outline-none font-medium text-foreground bg-transparent"
          placeholder="0"
        />
      </td>
      <td className="p-4 text-right">
        <div className={`text-xs font-bold ${item.pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
          {item.pl_amount > 0 ? '+' : ''}{formatNumber(item.pl_amount)}
        </div>
        <div className={`text-[10px] font-medium ${item.pl_rate >= 0 ? 'text-danger' : 'text-primary'}`}>
          ({item.pl_rate.toFixed(2)}%)
        </div>
      </td>
      <td className="p-4 text-right font-bold text-foreground">
        {formatNumber(item.current_value)}
        <div className="text-[10px] text-muted font-normal">{item.current_weight.toFixed(1)}%</div>
      </td>
      <td className="p-4 text-right bg-primary/10 font-bold text-primary">
        {formatNumber(item.target_value)}
      </td>
      <td className="p-4 text-center bg-primary/10">
        {item.action_quantity !== 0 ? (
          executeConfirmId === item.id ? (
            <div className="flex items-center justify-center gap-1 animate-in slide-in-from-right-2">
              <button onClick={() => onExecuteTrade(item)} className="bg-success text-white px-2 py-1 rounded text-[10px] font-bold hover:bg-success/80 shadow-sm transition-colors">체결</button>
              <button onClick={() => onSetExecuteConfirmId(null)} className="bg-secondary text-muted px-2 py-1 rounded text-[10px] font-bold hover:bg-muted/20 transition-colors">취소</button>
            </div>
          ) : (
            <button
              onClick={() => onSetExecuteConfirmId(item.id!)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-black w-full justify-center transition-all shadow-sm active:scale-95 ${
                item.action_quantity > 0 ? 'bg-danger text-white hover:bg-danger/80' : 'bg-primary text-white hover:bg-primary/80'
              }`}
            >
              <PlayCircle size={12} />
              {item.action_quantity > 0 ? '매수' : '매도'} {Math.abs(item.action_quantity)}주
            </button>
          )
        ) : <span className="text-muted text-xs">-</span>}
      </td>
      <td className="p-4 text-center">
        {deleteConfirmId === item.id ? (
          <div className="flex gap-1 justify-center animate-in zoom-in">
            <button onClick={() => onDeleteAsset(item.id!)} className="bg-danger text-white p-1.5 rounded-lg"><Check size={12} /></button>
            <button onClick={() => onSetDeleteConfirmId(null)} className="bg-secondary p-1.5 rounded-lg text-muted"><X size={12} /></button>
          </div>
        ) : (
          <button onClick={() => onSetDeleteConfirmId(item.id!)} className="text-muted hover:text-danger opacity-0 group-hover:opacity-100 transition-all">
            <Trash2 size={16} />
          </button>
        )}
      </td>
    </tr>
  );
}
```

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/lib/utils.ts src/components/AssetRow.tsx src/app/page.tsx
git commit -m "refactor(ui): extract AssetRow component and formatNumber util"
```

---

## Task 7: AssetTable 컴포넌트 분리 + page.tsx 완성

**Files:**
- Create: `frontend/src/components/AssetTable.tsx`
- Modify: `frontend/src/app/page.tsx` (최종 형태)

- [ ] **Step 1: AssetTable.tsx 생성**

`frontend/src/components/AssetTable.tsx`:
```tsx
"use client";

import { RefreshCw, Activity } from 'lucide-react';
import { Account, Asset } from '../types';
import { AssetRow } from './AssetRow';

interface AssetTableProps {
  account: Account;
  isGuest: boolean;
  loadingRowId: number | null;
  deleteConfirmId: number | null;
  executeConfirmId: number | null;
  isLoadingPrices: boolean;
  isAutoRefreshEnabled: boolean;
  onUpdateAsset: (id: number, field: string, value: string | number) => void;
  onDeleteAsset: (id: number) => void;
  onExecuteTrade: (asset: Asset) => void;
  onFetchAssetInfo: (id: number, code: string) => void;
  onAddAsset: (accountId: number) => void;
  onSetDeleteConfirmId: (id: number | null) => void;
  onSetExecuteConfirmId: (id: number | null) => void;
  onToggleAutoRefresh: () => void;
  showToast: (message: string, type?: 'info' | 'error') => void;
}

export function AssetTable({
  account, isGuest, loadingRowId, deleteConfirmId, executeConfirmId,
  isLoadingPrices, isAutoRefreshEnabled, onUpdateAsset, onDeleteAsset,
  onExecuteTrade, onFetchAssetInfo, onAddAsset, onSetDeleteConfirmId,
  onSetExecuteConfirmId, onToggleAutoRefresh, showToast,
}: AssetTableProps) {
  const totalTargetWeight = account.assets.reduce((sum, a) => sum + (a.target_weight || 0), 0);
  const remaining = 100 - totalTargetWeight;
  const isOver = remaining < 0;
  const isExact = Math.abs(remaining) < 0.01;

  return (
    <div className="bg-card rounded-xl shadow-sm overflow-hidden border border-border">
      <div className="p-4 border-b border-border flex justify-between items-center bg-secondary/50">
        <div className="text-xs text-muted leading-relaxed">
          * 평단가와 수량을 입력하면 손익이 자동 계산됩니다. <br />
          * &apos;매수/매도&apos; 버튼 클릭 시 계좌 예수금과 평단가가 실제 반영됩니다.
        </div>
        <button
          onClick={() => !isGuest && onToggleAutoRefresh()}
          className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-bold border transition-all ${
            isLoadingPrices
              ? 'bg-primary/10 text-primary border-primary/20'
              : isAutoRefreshEnabled
              ? 'bg-card text-primary border-primary/20 hover:bg-primary/5 shadow-sm'
              : 'bg-secondary text-muted border-border'
          }`}
        >
          {isLoadingPrices ? <RefreshCw size={14} className="animate-spin" /> : <Activity size={14} />}
          실시간 시세 {isGuest ? '(로그인 필요)' : isAutoRefreshEnabled ? '(자동갱신 중)' : '(일시 정지)'}
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead className="bg-secondary/50 text-muted font-bold text-[11px] uppercase tracking-wider">
            <tr>
              <th className="p-4 w-12 text-center">분류</th>
              <th className="p-4 min-w-[150px]">종목명/코드</th>
              <th className="p-4 text-center">
                <div>목표비중</div>
                <div className={`text-[10px] font-normal mt-1 ${isExact ? 'text-success' : isOver ? 'text-danger' : 'text-warning'}`}>
                  {isExact ? '✓ 100%' : isOver ? `초과 ${Math.abs(remaining).toFixed(1)}%` : `잔여 ${remaining.toFixed(1)}%`}
                </div>
              </th>
              <th className="p-4 text-right text-muted">평단가(원)</th>
              <th className="p-4 text-right">현재가(원)</th>
              <th className="p-4 text-right">수량</th>
              <th className="p-4 text-right">손익(%)</th>
              <th className="p-4 text-right">평가금액</th>
              <th className="p-4 text-right bg-primary/10 text-primary">목표금액</th>
              <th className="p-4 text-center bg-primary/10">리밸런싱 매매</th>
              <th className="p-4 text-center w-12"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {account.assets.map((item) => (
              <AssetRow
                key={item.id}
                item={item}
                isGuest={isGuest}
                loadingRowId={loadingRowId}
                deleteConfirmId={deleteConfirmId}
                executeConfirmId={executeConfirmId}
                totalTargetWeight={totalTargetWeight}
                onUpdateAsset={onUpdateAsset}
                onDeleteAsset={onDeleteAsset}
                onExecuteTrade={onExecuteTrade}
                onFetchAssetInfo={onFetchAssetInfo}
                onSetDeleteConfirmId={onSetDeleteConfirmId}
                onSetExecuteConfirmId={onSetExecuteConfirmId}
                showToast={showToast}
              />
            ))}
            <tr>
              <td colSpan={11} className="p-2 text-center bg-secondary/20">
                <button
                  onClick={() => onAddAsset(account.id!)}
                  className="text-sm text-muted hover:text-primary font-bold flex items-center justify-center w-full py-3 transition-colors tracking-widest"
                >
                  + 종목 추가 (ADD ASSET)
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: page.tsx 최종 형태로 교체**

`frontend/src/app/page.tsx` 전체를 아래 내용으로 교체:
```tsx
"use client";

import React, { useState, useEffect } from 'react';
import { Loader2, Wallet } from 'lucide-react';
import { Asset } from '../types';
import { Header } from '../components/Header';
import { Toast } from '../components/Toast';
import { AccountTabs } from '../components/AccountTabs';
import { AccountHeader } from '../components/AccountHeader';
import { AssetTable } from '../components/AssetTable';
import { SummarySection } from '../components/SummarySection';
import { DonutChart } from '../components/DonutChart';
import { usePortfolioData } from '../lib/hooks/usePortfolioData';
import { formatNumber } from '../lib/utils';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export default function Home() {
  const {
    accounts, fetchAccounts, isGuest, isLoading,
    addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
    createAccount: apiCreateAccount,
    updateAccountName: apiUpdateAccountName,
    deleteAccount: apiDeleteAccount,
    updateAllPrices,
  } = usePortfolioData();

  const [activeAccountId, setActiveAccountId] = useState<number | null>(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [executeConfirmId, setExecuteConfirmId] = useState<number | null>(null);
  const [loadingRowId, setLoadingRowId] = useState<number | null>(null);
  const [isAddingAccount, setIsAddingAccount] = useState(false);
  const [newAccountName, setNewAccountName] = useState('');
  const [toast, setToast] = useState({ message: '', type: 'info' as 'info' | 'error' });
  const [isLoadingPrices, setIsLoadingPrices] = useState(false);
  const [isAutoRefreshEnabled, setIsAutoRefreshEnabled] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  useEffect(() => {
    if (accounts.length > 0) {
      const currentExists = accounts.some(acc => acc.id === activeAccountId);
      if (activeAccountId === null || !currentExists) setActiveAccountId(accounts[0].id);
    }
  }, [accounts, activeAccountId]);

  useEffect(() => {
    if (isGuest || !isAutoRefreshEnabled) return;
    const run = async () => { setIsLoadingPrices(true); await updateAllPrices(); setIsLoadingPrices(false); };
    run();
    const id = setInterval(run, 10000);
    return () => clearInterval(id);
  }, [isGuest, updateAllPrices, isAutoRefreshEnabled]);

  const activeAccount = accounts.find(acc => acc.id === activeAccountId) ?? accounts[0];

  const showToast = (message: string, type: 'info' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: 'info' }), 3000);
  };

  const handleCreateAccount = async () => {
    if (!newAccountName.trim() || isSubmitting) return;
    if (isGuest) { showToast('게스트 모드에서는 계좌를 추가할 수 없습니다. 로그인해주세요.', 'error'); return; }
    setIsSubmitting(true);
    const res = await apiCreateAccount(newAccountName);
    if (res.success && res.id) {
      setNewAccountName(''); setIsAddingAccount(false); setActiveAccountId(res.id);
      showToast(`'${newAccountName}' 계좌가 생성되었습니다.`);
    } else showToast(res.message ?? '계좌 생성 실패', 'error');
    setIsSubmitting(false);
  };

  const executeTrade = async (asset: Asset) => {
    if (isGuest) { showToast('게스트 모드에서는 매매 실행이 지원되지 않습니다.'); setExecuteConfirmId(null); return; }
    if (!asset.action_quantity) { showToast('매매할 수량이 없습니다.'); setExecuteConfirmId(null); return; }
    try {
      const res = await fetch(`${API_URL}/assets/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('access_token')}` },
        body: JSON.stringify({ asset_id: asset.id, action_quantity: asset.action_quantity, price: asset.current_price }),
      });
      if (res.ok) {
        showToast(`${asset.name} ${Math.abs(asset.action_quantity)}주 ${asset.action_quantity > 0 ? '매수' : '매도'} 체결 완료!`);
        await fetchAccounts();
      } else showToast((await res.json()).detail ?? '체결 실패', 'error');
    } catch { showToast('체결 중 오류가 발생했습니다.', 'error'); }
    finally { setExecuteConfirmId(null); }
  };

  const fetchAssetInfoFromCode = async (id: number, code: string) => {
    setLoadingRowId(id);
    const res = await fetchAssetInfo(id, code);
    if (res.success) showToast(`${res.name} 정보 업데이트 완료!`);
    else showToast(res.message ?? '오류가 발생했습니다.', 'error');
    setLoadingRowId(null);
  };

  if (isLoading) return (
    <div className="min-h-screen flex flex-col items-center justify-center text-muted gap-2">
      <Loader2 className="animate-spin text-primary" size={32} />
      <p>포트폴리오 불러오는 중...</p>
    </div>
  );

  if (!activeAccount) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4 font-sans text-foreground relative">
      <Header />
      <div className="bg-card p-10 rounded-3xl shadow-xl text-center max-w-md w-full border border-border">
        <div className="w-20 h-20 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner">
          <Wallet size={40} />
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-2">환영합니다!</h2>
        <p className="text-muted mb-8 leading-relaxed">
          {isGuest ? '게스트 모드로 시작합니다.' : '아직 관리 중인 포트폴리오가 없습니다.'}
        </p>
        <div className="flex flex-col gap-3">
          <input
            type="text" value={newAccountName}
            onChange={(e) => setNewAccountName(e.target.value)}
            placeholder="포트폴리오 이름 (예: 퇴직연금)"
            className="w-full bg-secondary border border-border rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-primary focus:bg-card transition-all text-center font-medium text-foreground"
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleCreateAccount()}
            autoFocus
          />
          <button onClick={handleCreateAccount} disabled={!newAccountName.trim()}
            className="w-full bg-primary text-primary-foreground py-3 rounded-xl font-bold text-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-primary/20">
            시작하기
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="max-w-full mx-auto p-4 bg-background min-h-screen font-sans text-foreground relative">
      <Toast message={toast.message} type={toast.type} onClose={() => setToast({ message: '', type: 'info' })} />
      <Header />
      <AccountTabs
        accounts={accounts} activeAccountId={activeAccountId} isGuest={isGuest}
        isAddingAccount={isAddingAccount} newAccountName={newAccountName}
        isSubmitting={isSubmitting}
        onSelectAccount={setActiveAccountId} onStartAdding={() => setIsAddingAccount(true)}
        onCancelAdding={() => setIsAddingAccount(false)} onNameChange={setNewAccountName}
        onCreateAccount={handleCreateAccount}
      />
      <div className="space-y-6">
        <AccountHeader
          account={activeAccount} isGuest={isGuest}
          isEditingName={isEditingName} tempName={tempName}
          onStartEditing={() => { setTempName(activeAccount.name); setIsEditingName(true); }}
          onTempNameChange={setTempName}
          onConfirmEdit={() => { apiUpdateAccountName(activeAccount.id!, tempName); setIsEditingName(false); }}
          onCancelEdit={() => setIsEditingName(false)}
          onDeleteAccount={async () => {
            if (!confirm(`'${activeAccount.name}' 계좌를 삭제하시겠습니까?\n계좌에 포함된 모든 종목도 함께 삭제됩니다.`)) return;
            const res = await apiDeleteAccount(activeAccount.id);
            if (res.success) showToast(`'${activeAccount.name}' 계좌가 삭제되었습니다.`);
            else showToast(res.message ?? '계좌 삭제 실패', 'error');
          }}
        />
        <div className="flex flex-col xl:flex-row gap-6">
          <div className="flex-1 flex flex-col gap-6 min-w-0">
            <SummarySection account={activeAccount} onUpdateCash={updateCash} formatNumber={formatNumber} />
            <AssetTable
              account={activeAccount} isGuest={isGuest}
              loadingRowId={loadingRowId} deleteConfirmId={deleteConfirmId}
              executeConfirmId={executeConfirmId} isLoadingPrices={isLoadingPrices}
              isAutoRefreshEnabled={isAutoRefreshEnabled}
              onUpdateAsset={updateAsset} onDeleteAsset={deleteAsset}
              onExecuteTrade={executeTrade} onFetchAssetInfo={fetchAssetInfoFromCode}
              onAddAsset={(id) => addAsset(id, {})}
              onSetDeleteConfirmId={setDeleteConfirmId}
              onSetExecuteConfirmId={setExecuteConfirmId}
              onToggleAutoRefresh={() => setIsAutoRefreshEnabled(!isAutoRefreshEnabled)}
              showToast={showToast}
            />
          </div>
          <div className="w-full xl:w-[550px] shrink-0">
            <div className="sticky top-6">
              <DonutChart assets={activeAccount.assets} cash={activeAccount.cash ?? 0} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/components/AssetTable.tsx src/app/page.tsx
git commit -m "refactor(ui): extract AssetTable component, finalize page.tsx (~100 lines)"
```

---

## Task 8: 버그 수정 + 품질 개선

**Files:**
- Modify: `frontend/src/app/layout.tsx`
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`
- Create: `frontend/.env.example`

- [ ] **Step 1: layout.tsx metadata 수정**

`frontend/src/app/layout.tsx` 수정:
```tsx
export const metadata: Metadata = {
  title: "스노우볼 - 자산배분 대시보드",
  description: "포트폴리오 리밸런싱 자산배분 대시보드",
};
```
(darkreader-lock other 속성은 유지)

- [ ] **Step 2: usePortfolioData.ts에서 console.log 제거**

`frontend/src/lib/hooks/usePortfolioData.ts`에서 아래 3줄 삭제:
- Line ~345: `console.log(`Fetching info for code: ${code}`);`
- Line ~353: `console.log("Lookup result:", data);`
- Line ~388 (error handler 내): 관련 console.log 있으면 삭제

- [ ] **Step 3: .env.example 생성**

`frontend/.env.example`:
```
# Backend API URL
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

- [ ] **Step 4: .env.example을 git에 추가 (.gitignore 확인)**

```bash
cd frontend && cat .gitignore | grep ".env"
```

Expected: `.env.local` 등은 무시됨, `.env.example`은 무시 안 됨

- [ ] **Step 5: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/app/layout.tsx src/lib/hooks/usePortfolioData.ts .env.example
git commit -m "fix: remove console.log, fix metadata title, add .env.example"
```

---

## Task 9: fetchWithAuth 분리 + any 타입 제거

**Files:**
- Create: `frontend/src/lib/fetchWithAuth.ts`
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`

- [ ] **Step 1: fetchWithAuth.ts 생성**

`frontend/src/lib/fetchWithAuth.ts`:
```ts
import { useAuthStore, refreshAccessToken } from './auth';

export const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
  const token = localStorage.getItem('access_token');
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let res = await fetch(url, { ...options, headers });

  if (res.status === 401) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      res = await fetch(url, { ...options, headers: { ...options.headers, 'Authorization': `Bearer ${newToken}` } });
    } else {
      const isAuthenticated = useAuthStore.getState().isAuthenticated;
      if (isAuthenticated) {
        useAuthStore.getState().logout();
        window.location.href = '/auth';
      }
    }
  }
  return res;
};
```

- [ ] **Step 2: AssetField 타입 + updateAsset any 제거**

`frontend/src/lib/hooks/usePortfolioData.ts` 상단에 추가:
```ts
export type AssetField = 'targetRatio' | 'avgPrice' | 'price' | 'qty' | 'name' | 'category' | 'code';
export type AssetFieldValue = string | number;
```

`updateAsset` 시그니처 변경:
```ts
const updateAsset = async (id: number, field: AssetField, value: AssetFieldValue) => {
```

- [ ] **Step 3: usePortfolioData.ts에서 fetchWithAuth 인라인 정의 제거 + import**

파일 상단 `const fetchWithAuth = ...` 블록 삭제 후:
```ts
import { fetchWithAuth } from '../fetchWithAuth';
```

- [ ] **Step 4: TypeScript 확인**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 0개 (또는 기존보다 감소)

- [ ] **Step 5: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/lib/fetchWithAuth.ts src/lib/hooks/usePortfolioData.ts
git commit -m "refactor: extract fetchWithAuth, remove any types from updateAsset"
```

---

## Task 10: useAccounts 훅 분리

**Files:**
- Create: `frontend/src/lib/hooks/useAccounts.ts`
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`

- [ ] **Step 1: useAccounts.ts 생성**

`frontend/src/lib/hooks/useAccounts.ts`:
```ts
import { useState, useCallback } from 'react';
import { Account, Asset } from '../../types';
import { usePortfolioStore, Asset as StoreAsset } from '../store';
import { fetchWithAuth } from '../fetchWithAuth';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

const calculateAsset = (asset: StoreAsset, totalValue: number): Asset => {
  const current_value = asset.currentPrice * asset.quantity;
  const invested_amount = asset.avgPrice * asset.quantity;
  const pl_amount = current_value - invested_amount;
  const pl_rate = asset.avgPrice > 0 ? (pl_amount / invested_amount) * 100 : 0;
  const target_value = totalValue * (asset.targetWeight / 100);
  const diff_value = target_value - current_value;
  const action_quantity = asset.currentPrice > 0 ? Math.floor(diff_value / asset.currentPrice) : 0;
  return {
    ...asset,
    id: asset.id ?? Math.random(),
    account_id: -1,
    target_weight: asset.targetWeight,
    current_price: asset.currentPrice,
    avg_price: asset.avgPrice,
    current_value, invested_amount, pl_amount, pl_rate,
    current_weight: totalValue > 0 ? (current_value / totalValue) * 100 : 0,
    target_value, diff_value,
    action: 'HOLD' as const,
    action_quantity,
  };
};

export function useAccounts(isGuest: boolean) {
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    try {
      if (isGuest) {
        const totalAssets = storeAssets.reduce((sum, a) => sum + a.currentPrice * a.quantity, 0);
        const totalValue = totalAssets + storeCash;
        const guestAssets = storeAssets.map(a => calculateAsset(a, totalValue));
        const totalInvested = storeAssets.reduce((sum, a) => sum + a.avgPrice * a.quantity, 0);
        const totalPl = totalAssets - totalInvested;
        const guestAccount: Account = {
          id: -1, name: '게스트 포트폴리오', cash: storeCash,
          assets: guestAssets, total_asset_value: totalValue,
          total_invested_value: totalInvested, total_pl_amount: totalPl,
          total_pl_rate: totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0,
        };
        setAccounts([guestAccount]);
      } else {
        const res = await fetchWithAuth(`${API_URL}/accounts`);
        if (res.ok) setAccounts(await res.json());
      }
    } catch (e) {
      console.error('fetchAccounts failed', e);
    } finally {
      setIsLoading(false);
    }
  }, [isGuest, storeAssets, storeCash]);

  return { accounts, setAccounts, isLoading, fetchAccounts };
}
```

- [ ] **Step 2: usePortfolioData.ts에서 accounts 관련 상태 + fetchAccounts를 useAccounts로 교체**

`usePortfolioData.ts` 상단에:
```ts
import { useAccounts } from './useAccounts';
```

기존 `const [accounts, setAccounts] = useState(...)`, `const [isLoading, setIsLoading] = useState(true)`, `const fetchAccounts = useCallback(...)` 블록 삭제 후:
```ts
const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest);
```

또한 `calculateAsset` 함수 정의도 `usePortfolioData.ts`에서 삭제 (useAccounts.ts로 이동했으므로)

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/lib/hooks/useAccounts.ts src/lib/hooks/usePortfolioData.ts
git commit -m "refactor: extract useAccounts hook"
```

---

## Task 11: useAssetActions + usePriceRefresh 훅 분리

**Files:**
- Create: `frontend/src/lib/hooks/useAssetActions.ts`
- Create: `frontend/src/lib/hooks/usePriceRefresh.ts`
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`

- [ ] **Step 1: useAssetActions.ts 생성**

`frontend/src/lib/hooks/useAssetActions.ts`:
```ts
import { usePortfolioStore, Asset as StoreAsset } from '../store';
import { fetchWithAuth } from '../fetchWithAuth';
import { Account } from '../../types';
import { AssetField, AssetFieldValue } from './usePortfolioData';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface UseAssetActionsOptions {
  isGuest: boolean;
  getAuthToken: () => string | null;
  accounts: Account[];
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
  fetchAccounts: () => Promise<void>;
}

export function useAssetActions({ isGuest, getAuthToken, accounts, setAccounts, fetchAccounts }: UseAssetActionsOptions) {
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeAddAsset = usePortfolioStore(state => state.addAsset);
  const storeUpdateAsset = usePortfolioStore(state => state.updateAsset);
  const storeRemoveAsset = usePortfolioStore(state => state.removeAsset);
  const storeSetCash = usePortfolioStore(state => state.setCash);

  const addAsset = async (accountId: number, asset: Partial<StoreAsset>) => {
    if (isGuest) {
      storeAddAsset({ name: asset.name ?? '새 종목', category: asset.category ?? '주식',
        targetWeight: asset.targetWeight ?? 0, currentPrice: asset.currentPrice ?? 0,
        avgPrice: asset.avgPrice ?? 0, quantity: asset.quantity ?? 0, code: asset.code });
    } else {
      try {
        await fetch(`${API_URL}/assets`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
          body: JSON.stringify({ account_id: accountId, name: asset.name ?? '', category: asset.category ?? '주식' }),
        });
        fetchAccounts();
      } catch (e) { console.error(e); }
    }
  };

  const updateAsset = async (id: number, field: AssetField, value: AssetFieldValue) => {
    setAccounts(prev => prev.map(acc => {
      const idx = acc.assets.findIndex(a => a.id === id);
      if (idx === -1) return acc;
      const updated = [...acc.assets];
      const a = { ...updated[idx] };
      const numVal = typeof value === 'string' ? parseFloat(value) || 0 : value;
      if (field === 'targetRatio') a.target_weight = numVal as number;
      else if (field === 'avgPrice') a.avg_price = numVal as number;
      else if (field === 'price') a.current_price = numVal as number;
      else if (field === 'qty') a.quantity = numVal as number;
      else if (field === 'name') a.name = String(value);
      else if (field === 'category') a.category = String(value);
      else if (field === 'code') a.code = String(value);
      a.current_value = a.current_price * a.quantity;
      a.invested_amount = a.avg_price * a.quantity;
      a.pl_amount = a.current_value - a.invested_amount;
      a.pl_rate = a.invested_amount > 0 ? (a.pl_amount / a.invested_amount) * 100 : 0;
      updated[idx] = a;
      const totalAssetValue = updated.reduce((sum, item) => sum + item.current_value, 0) + acc.cash;
      updated.forEach(item => {
        item.current_weight = totalAssetValue > 0 ? (item.current_value / totalAssetValue) * 100 : 0;
        item.target_value = totalAssetValue * (item.target_weight / 100);
        item.diff_value = item.target_value - item.current_value;
        item.action_quantity = item.current_price > 0 ? Math.floor(item.diff_value / item.current_price) : 0;
      });
      return { ...acc, assets: updated, total_asset_value: totalAssetValue };
    }));

    if (isGuest) {
      const asset = storeAssets.find(a => a.id === id);
      if (!asset) return;
      const p: Partial<StoreAsset> = {};
      if (field === 'targetRatio') p.targetWeight = typeof value === 'string' ? parseFloat(value) || 0 : value;
      else if (field === 'avgPrice') p.avgPrice = typeof value === 'string' ? parseFloat(value) || 0 : value;
      else if (field === 'price') p.currentPrice = typeof value === 'string' ? parseFloat(value) || 0 : value;
      else if (field === 'qty') p.quantity = typeof value === 'string' ? parseFloat(value) || 0 : value;
      else if (field === 'name') p.name = String(value);
      else if (field === 'category') p.category = String(value);
      else if (field === 'code') p.code = String(value);
      storeUpdateAsset(id, p);
    } else {
      const fieldMap: Record<AssetField, string> = {
        targetRatio: 'target_weight', avgPrice: 'avg_price', price: 'current_price',
        qty: 'quantity', name: 'name', category: 'category', code: 'code',
      };
      const finalVal = typeof value === 'string' && ['price','avgPrice','qty','targetRatio'].includes(field)
        ? parseFloat(value.replace(/,/g, '')) || 0 : value;
      try {
        await fetch(`${API_URL}/assets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
          body: JSON.stringify({ [fieldMap[field]]: finalVal }),
        });
      } catch (e) { console.error(e); }
    }
  };

  const deleteAsset = async (id: number) => {
    if (isGuest) { storeRemoveAsset(id); return; }
    try {
      await fetch(`${API_URL}/assets/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
      fetchAccounts();
    } catch (e) { console.error(e); }
  };

  const updateCash = async (accountId: number, val: string | number) => {
    const numVal = typeof val === 'string' ? parseFloat(val.replace(/,/g, '')) : val;
    if (isNaN(numVal)) return;
    setAccounts(prev => prev.map(acc => {
      if (acc.id !== accountId) return acc;
      const updated = [...acc.assets];
      const total = updated.reduce((s, i) => s + i.current_value, 0) + numVal;
      updated.forEach(item => {
        item.current_weight = total > 0 ? (item.current_value / total) * 100 : 0;
        item.target_value = total * (item.target_weight / 100);
        item.diff_value = item.target_value - item.current_value;
        item.action_quantity = item.current_price > 0 ? Math.floor(item.diff_value / item.current_price) : 0;
      });
      return { ...acc, cash: numVal, assets: updated, total_asset_value: total };
    }));
    if (isGuest) { storeSetCash(numVal); return; }
    try {
      await fetch(`${API_URL}/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ cash: numVal }),
      });
    } catch (e) { console.error(e); }
  };

  const fetchAssetInfo = async (id: number, code: string) => {
    if (!code) return { success: false, message: '코드를 입력하세요.' };
    try {
      const headers: Record<string, string> = {};
      const t = getAuthToken();
      if (t) headers['Authorization'] = `Bearer ${t}`;
      const res = await fetch(`${API_URL}/finance/lookup?code=${code}`, { headers });
      if (!res.ok) throw new Error(`Lookup failed: ${await res.text()}`);
      const data = await res.json();
      if (isGuest) {
        storeUpdateAsset(id, { name: data.name, currentPrice: data.price, code, category: data.category });
      } else {
        const up = await fetch(`${API_URL}/assets/${id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
          body: JSON.stringify({ name: data.name, current_price: data.price, code, category: data.category }),
        });
        if (!up.ok) throw new Error('Failed to update asset');
        await fetchAccounts();
      }
      return { success: true, name: data.name };
    } catch (error: unknown) {
      return { success: false, message: error instanceof Error ? error.message : '정보를 찾을 수 없습니다.' };
    }
  };

  return { addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo };
}
```

- [ ] **Step 2: usePriceRefresh.ts 생성**

`frontend/src/lib/hooks/usePriceRefresh.ts`:
```ts
import { useCallback } from 'react';
import { Account } from '../../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

interface UsePriceRefreshOptions {
  isGuest: boolean;
  getAuthToken: () => string | null;
  setAccounts: React.Dispatch<React.SetStateAction<Account[]>>;
}

export function usePriceRefresh({ isGuest, getAuthToken, setAccounts }: UsePriceRefreshOptions) {
  const updateAllPrices = useCallback(async (): Promise<{ success: boolean; updatedCount?: number }> => {
    if (isGuest) return { success: false };
    try {
      const res = await fetch(`${API_URL}/assets/update-all-prices`, {
        method: 'POST', headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) return { success: false };
      const data = await res.json();
      const accountsRes = await fetch(`${API_URL}/accounts`, { headers: { 'Authorization': `Bearer ${getAuthToken()}` } });
      if (accountsRes.ok) setAccounts(await accountsRes.json());
      return { success: true, updatedCount: data.updated_count };
    } catch {
      return { success: false };
    }
  }, [isGuest, getAuthToken, setAccounts]);

  return { updateAllPrices };
}
```

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/lib/hooks/useAssetActions.ts src/lib/hooks/usePriceRefresh.ts
git commit -m "refactor: extract useAssetActions and usePriceRefresh hooks"
```

---

## Task 12: usePortfolioData 재조합 + createAccount/deleteAccount 이동

**Files:**
- Modify: `frontend/src/lib/hooks/usePortfolioData.ts`

- [ ] **Step 1: usePortfolioData.ts 재작성** (하위호환 export 유지)

`frontend/src/lib/hooks/usePortfolioData.ts` 전체를 아래로 교체:
```ts
import { useEffect, useCallback } from 'react';
import { useAuthStore } from '../auth';
import { usePortfolioStore } from '../store';
import { fetchWithAuth } from '../fetchWithAuth';
import { useAccounts } from './useAccounts';
import { useAssetActions } from './useAssetActions';
import { usePriceRefresh } from './usePriceRefresh';

export type AssetField = 'targetRatio' | 'avgPrice' | 'price' | 'qty' | 'name' | 'category' | 'code';
export type AssetFieldValue = string | number;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api/v1';

export const usePortfolioData = () => {
  const { isAuthenticated, token } = useAuthStore();
  const isGuest = !isAuthenticated;
  const getAuthToken = () => token ?? localStorage.getItem('access_token');

  const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest);
  const { addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo } = useAssetActions({
    isGuest, getAuthToken, accounts, setAccounts, fetchAccounts,
  });
  const { updateAllPrices } = usePriceRefresh({ isGuest, getAuthToken, setAccounts });

  useEffect(() => { fetchAccounts(); }, [isGuest, token]);

  // Guest mode: refetch when store changes
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);
  useEffect(() => { if (isGuest) fetchAccounts(); }, [storeAssets, storeCash, isGuest]);

  const createAccount = async (name: string) => {
    if (isGuest) return { success: false, message: '게스트 모드에서는 계좌를 추가할 수 없습니다.' };
    try {
      const res = await fetchWithAuth(`${API_URL}/accounts`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, cash: 0 }),
      });
      if (!res.ok) return { success: false, message: `계좌 생성 실패: ${await res.text()}` };
      const newAccount = await res.json();
      await fetchAccounts();
      return { success: true, id: newAccount.id };
    } catch { return { success: false, message: '계좌 생성 실패 (네트워크 오류)' }; }
  };

  const updateAccountName = async (accountId: number, newName: string) => {
    setAccounts(prev => prev.map(acc => acc.id === accountId ? { ...acc, name: newName } : acc));
    if (isGuest) return;
    try {
      await fetch(`${API_URL}/accounts/${accountId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
        body: JSON.stringify({ name: newName }),
      });
    } catch (e) { console.error(e); }
  };

  const deleteAccount = async (accountId: number): Promise<{ success: boolean; message?: string }> => {
    if (isGuest) return { success: false, message: '게스트 모드에서는 계좌를 삭제할 수 없습니다.' };
    try {
      const res = await fetch(`${API_URL}/accounts/${accountId}`, {
        method: 'DELETE', headers: { 'Authorization': `Bearer ${getAuthToken()}` },
      });
      if (!res.ok) return { success: false, message: '계좌 삭제 실패' };
      setAccounts(prev => prev.filter(acc => acc.id !== accountId));
      return { success: true };
    } catch { return { success: false, message: '계좌 삭제 실패 (네트워크 오류)' }; }
  };

  return {
    accounts, fetchAccounts, isGuest, isLoading,
    addAsset, updateAsset, deleteAsset, updateCash, fetchAssetInfo,
    createAccount, updateAccountName, deleteAccount, updateAllPrices,
  };
};
```

- [ ] **Step 2: 기존 테스트가 여전히 같은 API를 사용하는지 확인**

```bash
cd frontend && grep -n "usePortfolioData" tests/hooks/usePortfolioData.test.ts
```

Expected: `import { usePortfolioData } from '../../src/lib/hooks/usePortfolioData'` — 그대로

- [ ] **Step 3: 테스트 + 커밋**

```bash
cd frontend && npm test -- --run
git add src/lib/hooks/usePortfolioData.ts
git commit -m "refactor: rewrite usePortfolioData to compose sub-hooks (200 lines)"
```

---

## Task 13: 최종 검증

**Files:** (없음)

- [ ] **Step 1: 전체 테스트 실행**

```bash
cd frontend && npm test -- --run
```

Expected: 전체 PASS

- [ ] **Step 2: TypeScript 타입 체크**

```bash
cd frontend && npx tsc --noEmit
```

Expected: 에러 0개

- [ ] **Step 3: console.log 잔존 확인**

```bash
grep -r "console.log" frontend/src/
```

Expected: 출력 없음

- [ ] **Step 4: 파일 크기 확인**

```bash
wc -l frontend/src/app/page.tsx frontend/src/lib/hooks/usePortfolioData.ts
```

Expected: page.tsx ≤ 120줄, usePortfolioData.ts ≤ 200줄

- [ ] **Step 5: any 타입 잔존 확인**

```bash
grep -n ": any" frontend/src/lib/hooks/ -r
```

Expected: 출력 없음

- [ ] **Step 6: 최종 커밋**

```bash
cd frontend
git add -A
git commit -m "chore: frontend refactoring complete - Vercel React Best Practices 적용"
```

---

## 완료 기준 체크리스트

- [ ] `page.tsx` 100~120줄 이하
- [ ] 각 분리된 컴포넌트 파일 200줄 이하
- [ ] `usePortfolioData.ts` 200줄 이하
- [ ] `any` 타입 0개
- [ ] `console.log` 0개
- [ ] 기존 테스트 전부 통과
- [ ] `localStorage.getItem('token')` 버그 수정 (Task 7에서 `'access_token'`으로 수정됨)
- [ ] `.env.example` 생성 완료
- [ ] `layout.tsx` 메타데이터 수정 완료
