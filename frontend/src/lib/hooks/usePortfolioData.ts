import { useEffect } from 'react';
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
