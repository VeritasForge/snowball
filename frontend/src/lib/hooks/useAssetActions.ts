import React from 'react';
import { usePortfolioStore, Asset as StoreAsset } from '../store';
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
