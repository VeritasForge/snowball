import { useState, useCallback, useEffect, useRef, startTransition } from 'react';
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

export function useAccounts(isGuest: boolean, onError?: (msg: string) => void) {
  const storeAssets = usePortfolioStore(state => state.assets);
  const storeCash = usePortfolioStore(state => state.cash);

  const [accounts, setAccounts] = useState<Account[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const abortRef = useRef<AbortController | null>(null);
  // Monotonic mutation counter. replaceAccount() bumps it; fetchAccounts
  // captures it at start and discards its result if a mutation landed while
  // the request was in flight (prevents a stale poll clobbering a fresh
  // preset-apply result — abortRef can't help since replaceAccount issues
  // no new fetch to abort the old one).
  const lastMutationRef = useRef(0);
  // storeAssets/storeCash/onError를 ref로 포워딩: fetchAccounts deps에서 제외하여 polling interval 안정화
  const storeAssetsRef = useRef(storeAssets);
  const storeCashRef = useRef(storeCash);
  const onErrorRef = useRef(onError);
  useEffect(() => {
    storeAssetsRef.current = storeAssets;
    storeCashRef.current = storeCash;
    onErrorRef.current = onError;
  });

  const fetchAccounts = useCallback(async (): Promise<void> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const mutationAtStart = lastMutationRef.current;

    try {
      if (isGuest) {
        const assets = storeAssetsRef.current;
        const cash = storeCashRef.current;
        const totalAssets = assets.reduce((sum, a) => sum + a.currentPrice * a.quantity, 0);
        const totalValue = totalAssets + cash;
        const guestAssets = assets.map(a => calculateAsset(a, totalValue));
        const totalInvested = assets.reduce((sum, a) => sum + a.avgPrice * a.quantity, 0);
        const totalPl = totalAssets - totalInvested;
        const guestAccount: Account = {
          id: -1, name: '게스트 포트폴리오', cash,
          assets: guestAssets, total_asset_value: totalValue,
          total_invested_value: totalInvested, total_pl_amount: totalPl,
          total_pl_rate: totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0,
        };
        startTransition(() => {
          setAccounts([guestAccount]);
          setIsLoading(false);
        });
      } else {
        const res = await fetchWithAuth(`${API_URL}/accounts`, { signal: controller.signal });
        if (res.ok) {
          const data: Account[] = await res.json();
          startTransition(() => {
            // Re-check inside a functional updater so the guard runs at COMMIT
            // time, not when this callback fires. startTransition defers the
            // commit; the updater runs during the deferred render — after any
            // urgent replaceAccount() has committed and bumped lastMutationRef.
            // So a mutation landing between this callback and the deferred flush
            // still wins (the updater returns prev, discarding the stale snapshot).
            setAccounts(prev => (lastMutationRef.current !== mutationAtStart ? prev : data));
            setIsLoading(false);
          });
        } else {
          onErrorRef.current?.('데이터를 불러오지 못했습니다.');
          setIsLoading(false);
        }
      }
    } catch (e: unknown) {
      if (e instanceof DOMException && e.name === 'AbortError') return;
      console.error('fetchAccounts failed', e instanceof Error ? e.message : e);
      onErrorRef.current?.('네트워크 오류가 발생했습니다.');
      setIsLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isGuest]); // storeAssets/storeCash/onError는 ref로 읽어 deps에서 의도적으로 제외

  // Replace one account in place (e.g. after a preset apply returns the
  // recomputed account) without a refetch. Bumps lastMutationRef so any
  // in-flight poll discards its now-stale snapshot. Functional setState
  // keeps the callback stable across renders.
  const replaceAccount = useCallback((account: Account): void => {
    lastMutationRef.current += 1;
    setAccounts(prev => prev.map(acc => (acc.id === account.id ? account : acc)));
  }, []);

  return { accounts, setAccounts, isLoading, fetchAccounts, replaceAccount };
}
