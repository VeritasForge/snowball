import React, { useCallback } from 'react';
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
