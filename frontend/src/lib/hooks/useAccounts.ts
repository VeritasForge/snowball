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
