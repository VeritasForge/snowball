import React from 'react';
import { Account } from '../types';
import { NumberFormatInput } from './NumberFormatInput';
import { useCountUp } from '../lib/hooks/useCountUp';

interface SummarySectionProps {
  account: Account;
  onUpdateCash: (id: number, cash: string | number) => void;
  formatNumber: (num: number) => string;
}

export const SummarySection: React.FC<SummarySectionProps> = ({ account, onUpdateCash, formatNumber }) => {
  const totalAssetValue = useCountUp(0, account.total_asset_value, 600);
  const plAmount = useCountUp(0, account.total_pl_amount, 600);
  const totalInvestedValue = useCountUp(0, account.total_invested_value, 600);

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 fade-up-stagger">
      <div className="bg-card p-5 rounded-lg shadow-sm border-l-4 border-accent">
        <h3 className="text-muted text-sm font-medium">총 자산 (주식+현금)</h3>
        <p className="text-2xl font-bold mt-1 text-foreground font-mono tabular-nums">{formatNumber(totalAssetValue)}원</p>
      </div>
      <div className={`bg-card p-5 rounded-lg shadow-sm border-l-4 ${account.total_pl_amount >= 0 ? 'border-danger' : 'border-primary'}`}>
        <h3 className="text-muted text-sm font-medium">총 평가 손익</h3>
        <div className="flex items-baseline gap-2 mt-1">
          <span className={`text-2xl font-bold font-mono tabular-nums ${account.total_pl_amount >= 0 ? 'text-danger' : 'text-primary'}`}>
            {account.total_pl_amount > 0 ? '+' : ''}{formatNumber(plAmount)}원
          </span>
          <span className={`text-sm font-medium font-mono tabular-nums ${account.total_pl_rate >= 0 ? 'text-danger' : 'text-primary'}`}>
            ({account.total_pl_rate > 0 ? '+' : ''}{account.total_pl_rate.toFixed(2)}%)
          </span>
        </div>
      </div>
      <div className="bg-card p-5 rounded-lg shadow-sm border-l-4 border-success">
        <h3 className="text-muted text-sm font-medium">투자 자산 (평가금)</h3>
        <p className="text-2xl font-bold mt-1 text-foreground font-mono tabular-nums">{formatNumber(totalInvestedValue)}원</p>
      </div>
      <div className="bg-card p-5 rounded-lg shadow-sm border-l-4 border-warning">
        <h3 className="text-muted text-sm font-medium">보유 현금 (예수금)</h3>
        <div className="flex items-center gap-2 mt-1">
          <NumberFormatInput
            value={account.cash}
            onChange={(val) => onUpdateCash(account.id, val)}
            className="text-2xl font-bold border-b-2 border-warning/50 focus:border-warning outline-none w-full bg-transparent text-foreground font-mono tabular-nums"
          />
          <span className="text-muted">원</span>
        </div>
      </div>
    </div>
  );
};
