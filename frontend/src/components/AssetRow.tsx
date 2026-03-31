"use client";

import { Loader2, Search, PlayCircle, Check, X, Trash2 } from 'lucide-react';
import { Asset } from '../types';
import { CategorySelector } from './CategorySelector';
import { NumberFormatInput } from './NumberFormatInput';
import { formatNumber } from '../lib/utils';
import type { AssetField, AssetFieldValue } from '../lib/hooks/usePortfolioData';

interface AssetRowProps {
  item: Asset;
  isGuest: boolean;
  loadingRowId: number | null;
  deleteConfirmId: number | null;
  executeConfirmId: number | null;
  totalTargetWeight: number;
  onUpdateAsset: (id: number, field: AssetField, value: AssetFieldValue) => void;
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
