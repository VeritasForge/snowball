"use client";

import { RefreshCw, Activity } from 'lucide-react';
import { Account, Asset } from '../types';
import { AssetRow } from './AssetRow';
import type { AssetField, AssetFieldValue } from '../lib/hooks/usePortfolioData';

interface AssetTableProps {
  account: Account;
  isGuest: boolean;
  loadingRowId: number | null;
  deleteConfirmId: number | null;
  executeConfirmId: number | null;
  isLoadingPrices: boolean;
  isAutoRefreshEnabled: boolean;
  onUpdateAsset: (id: number, field: AssetField, value: AssetFieldValue) => void;
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
