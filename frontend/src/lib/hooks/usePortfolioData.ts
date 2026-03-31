import { useEffect, useCallback } from 'react';
import { usePortfolioStore, Asset as StoreAsset } from '../store';
import { useAuthStore } from '../auth';
import { fetchWithAuth } from '../fetchWithAuth';
import { useAccounts } from './useAccounts';

export type AssetField = 'targetRatio' | 'avgPrice' | 'price' | 'qty' | 'name' | 'category' | 'code';
export type AssetFieldValue = string | number;

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api/v1";

export const usePortfolioData = () => {
    const { isAuthenticated, token } = useAuthStore();
    const isGuest = !isAuthenticated;

    // zustand hydration 문제 대비 localStorage fallback
    const getAuthToken = () => token || localStorage.getItem('access_token');

    // Select specific state to prevent unnecessary re-renders
    const assets = usePortfolioStore(state => state.assets);
    const cash = usePortfolioStore(state => state.cash);
    const storeAddAsset = usePortfolioStore(state => state.addAsset);
    const storeUpdateAsset = usePortfolioStore(state => state.updateAsset);
    const storeRemoveAsset = usePortfolioStore(state => state.removeAsset);
    const storeSetCash = usePortfolioStore(state => state.setCash);

    const { accounts, setAccounts, isLoading, fetchAccounts } = useAccounts(isGuest);

    // Initial fetch and re-fetch on auth change
    useEffect(() => {
        fetchAccounts();
    }, [isGuest, token]);

    // Sync store changes only in Guest mode
    useEffect(() => {
        if (isGuest) {
            fetchAccounts();
        }
    }, [assets, cash, isGuest]);

    const addAsset = async (accountId: number, asset: Partial<StoreAsset>) => {
        if (isGuest) {
            storeAddAsset({
                name: asset.name || "새 종목",
                category: asset.category || "주식",
                targetWeight: asset.targetWeight || 0,
                currentPrice: asset.currentPrice || 0,
                avgPrice: asset.avgPrice || 0,
                quantity: asset.quantity || 0,
                code: asset.code
            });
            // fetchAccounts will be triggered by dependency change (assets)
        } else {
            try {
                await fetch(`${API_URL}/assets`, {
                    method: "POST",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({
                        account_id: accountId,
                        name: asset.name || "",
                        category: asset.category || "주식"
                    })
                });
                fetchAccounts();
            } catch (e) { console.error(e); }
        }
    };

    const updateAsset = async (id: number, field: AssetField, value: AssetFieldValue) => {
        // 1. Optimistic Update (Update Local State Immediately)
        setAccounts(prevAccounts => {
            return prevAccounts.map(acc => {
                const assetIndex = acc.assets.findIndex(a => a.id === id);
                if (assetIndex === -1) return acc;

                const updatedAssets = [...acc.assets];
                // Handle type conversion for calculation
                const numVal = parseFloat(String(value)) || 0;
                const strVal = String(value);

                // Map field names
                if (field === 'targetRatio') updatedAssets[assetIndex].target_weight = numVal;
                else if (field === 'avgPrice') updatedAssets[assetIndex].avg_price = numVal;
                else if (field === 'price') updatedAssets[assetIndex].current_price = numVal;
                else if (field === 'qty') updatedAssets[assetIndex].quantity = numVal;
                else if (field === 'name') updatedAssets[assetIndex].name = strVal;
                else if (field === 'category') updatedAssets[assetIndex].category = strVal;
                else if (field === 'code') updatedAssets[assetIndex].code = strVal;

                // Re-calculate local asset stats (Simple version for immediate feedback)
                const a = updatedAssets[assetIndex];
                a.current_value = a.current_price * a.quantity;
                a.invested_amount = a.avg_price * a.quantity;
                a.pl_amount = a.current_value - a.invested_amount;
                a.pl_rate = a.invested_amount > 0 ? (a.pl_amount / a.invested_amount) * 100 : 0;
                
                // Recalculate Account Totals
                const totalAssetValue = updatedAssets.reduce((sum, item) => sum + item.current_value, 0) + acc.cash;
                // Update weights
                updatedAssets.forEach(item => {
                    item.current_weight = totalAssetValue > 0 ? (item.current_value / totalAssetValue) * 100 : 0;
                    item.target_value = totalAssetValue * (item.target_weight / 100);
                    item.diff_value = item.target_value - item.current_value;
                    item.action_quantity = item.current_price > 0 ? Math.floor(item.diff_value / item.current_price) : 0;
                });

                return {
                    ...acc,
                    assets: updatedAssets,
                    total_asset_value: totalAssetValue,
                    // Update other totals...
                };
            });
        });

        if (isGuest) {
            // ... (Store update logic)
            // Existing logic is fine as store update triggers re-render via dependency,
            // BUT we should avoid fetchAccounts triggering full reload.
            // Actually, for Guest, store update -> assets change -> fetchAccounts runs.
            // This causes re-render.
            // We should decouple fetchAccounts from assets dependency if we want manual control.
            // But let's fix Login mode first.
            
            const asset = assets.find(a => a.id === id);
            if (!asset) return;
            const updatePayload: Partial<StoreAsset> = {};
            // ... (existing mapping)
            if (field === 'targetRatio') updatePayload.targetWeight = parseFloat(String(value)) || 0;
            else if (field === 'avgPrice') updatePayload.avgPrice = parseFloat(String(value)) || 0;
            else if (field === 'price') updatePayload.currentPrice = parseFloat(String(value)) || 0;
            else if (field === 'qty') updatePayload.quantity = parseFloat(String(value)) || 0;
            else if (field === 'name') updatePayload.name = String(value);
            else if (field === 'category') updatePayload.category = String(value);
            else if (field === 'code') updatePayload.code = String(value);
            storeUpdateAsset(id, updatePayload);
        } else {
            // API Logic - Background Sync
            let finalVal = value;
            if (typeof value === 'string' && ['price', 'avgPrice', 'qty', 'targetRatio'].includes(field)) {
                finalVal = parseFloat(value.replace(/,/g, '')) || 0;
            }
            
            const fieldMap: Record<string, string> = {
                'targetRatio': 'target_weight',
                'avgPrice': 'avg_price',
                'price': 'current_price',
                'qty': 'quantity'
            };
            
            const beField = fieldMap[field] || field;

            try {
                // Don't await this if we want to be fast, but we want to catch errors.
                // We rely on Optimistic Update above for UI.
                await fetch(`${API_URL}/assets/${id}`, {
                    method: "PATCH",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ [beField]: finalVal })
                });
                // DO NOT call fetchAccounts() here. It kills focus.
            } catch(e) { console.error(e); }
        }
    };

    const deleteAsset = async (id: number) => {
        if (isGuest) {
            storeRemoveAsset(id);
        } else {
            try {
                await fetch(`${API_URL}/assets/${id}`, { 
                    method: "DELETE",
                    headers: { "Authorization": `Bearer ${getAuthToken()}` }
                });
                fetchAccounts();
            } catch(e) { console.error(e); }
        }
    };

    const updateCash = async (accountId: number, val: string) => {
        const numVal = parseFloat(val.replace(/,/g, ''));
        if (isNaN(numVal)) return;

        // Optimistic Update - 해당 계좌만 업데이트 + 재계산
        setAccounts(prev => prev.map(acc => {
            if (acc.id !== accountId) return acc;

            const updatedAssets = [...acc.assets];
            const totalAssetValue = updatedAssets.reduce((sum, item) => sum + item.current_value, 0) + numVal;

            // 비중, 목표금액, 리밸런싱 수량 재계산
            updatedAssets.forEach(item => {
                item.current_weight = totalAssetValue > 0 ? (item.current_value / totalAssetValue) * 100 : 0;
                item.target_value = totalAssetValue * (item.target_weight / 100);
                item.diff_value = item.target_value - item.current_value;
                item.action_quantity = item.current_price > 0 ? Math.floor(item.diff_value / item.current_price) : 0;
            });

            return {
                ...acc,
                cash: numVal,
                assets: updatedAssets,
                total_asset_value: totalAssetValue
            };
        }));

        if (isGuest) {
            storeSetCash(numVal);
        } else {
            try {
                await fetch(`${API_URL}/accounts/${accountId}`, {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ cash: numVal })
                });
            } catch(e) { console.error(e); }
        }
    };

    const fetchAssetInfo = async (id: number, code: string) => {
        if (!code) return { success: false, message: "코드를 입력하세요." };
        
        try {
            const headers: Record<string, string> = {};
            const authToken = getAuthToken();
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;

            const res = await fetch(`${API_URL}/finance/lookup?code=${code}`, { headers });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Lookup failed: ${errText}`);
            }

            const data = await res.json();
            
            // Update Asset with fetched data
            if (isGuest) {
                storeUpdateAsset(id, {
                    name: data.name,
                    currentPrice: data.price,
                    code: code,
                    category: data.category
                });
                // fetchAccounts will be triggered by dependency change
            } else {
                const updateRes = await fetch(`${API_URL}/assets/${id}`, {
                    method: "PATCH",
                    headers: { 
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${getAuthToken()}`
                    },
                    body: JSON.stringify({ 
                        name: data.name,
                        current_price: data.price,
                        code: code,
                        category: data.category
                    })
                });
                
                if (!updateRes.ok) {
                    throw new Error("Failed to update asset");
                }
                
                await fetchAccounts();
            }
            return { success: true, name: data.name };
        } catch (error: any) {
            console.error("fetchAssetInfo Error:", error);
            return { success: false, message: error.message || "정보를 찾을 수 없습니다." };
        }
    };

    const createAccount = async (name: string) => {
        if (isGuest) {
            return { success: false, message: "게스트 모드에서는 계좌를 추가할 수 없습니다." };
        }

        try {
            const res = await fetchWithAuth(`${API_URL}/accounts`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name, cash: 0 })
            });

            if (!res.ok) {
                const err = await res.text();
                console.error("Create Account Failed:", err);
                return { success: false, message: `계좌 생성 실패: ${err}` };
            }

            const newAccount = await res.json();
            await fetchAccounts();
            return { success: true, id: newAccount.id };
        } catch (e) {
            console.error(e);
            return { success: false, message: "계좌 생성 실패 (네트워크 오류)" };
        }
    };
    
    const updateAllPrices = useCallback(async (): Promise<{ success: boolean; updatedCount?: number }> => {
        if (isGuest) {
            return { success: false };
        }

        try {
            const res = await fetch(`${API_URL}/assets/update-all-prices`, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${getAuthToken()}`
                }
            });

            if (!res.ok) {
                return { success: false };
            }

            const data = await res.json();
            // fetchAccounts 대신 직접 accounts 갱신
            const accountsRes = await fetch(`${API_URL}/accounts`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            if (accountsRes.ok) {
                const accountsData = await accountsRes.json();
                setAccounts(accountsData);
            }
            return { success: true, updatedCount: data.updated_count };
        } catch (e) {
            console.error("Failed to update prices:", e);
            return { success: false };
        }
    }, [isGuest, token]);

    const updateAccountName = async (accountId: number, newName: string) => {
        if (isGuest) {
            // Guest mode: update only in memory (since guest has only one fake account usually)
            // But if we support rename for guest:
            setAccounts(prev => prev.map(acc => 
                acc.id === accountId ? { ...acc, name: newName } : acc
            ));
            return;
        }

        // Optimistic Update
        setAccounts(prev => prev.map(acc => 
            acc.id === accountId ? { ...acc, name: newName } : acc
        ));

        try {
            await fetch(`${API_URL}/accounts/${accountId}`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify({ name: newName })
            });
            // fetchAccounts(); // No need to re-fetch immediately
        } catch (e) {
            console.error(e);
            // Revert on error? Or show toast. For now, keep it simple.
        }
    };

    const deleteAccount = async (accountId: number): Promise<{ success: boolean; message?: string }> => {
        if (isGuest) {
            return { success: false, message: "게스트 모드에서는 계좌를 삭제할 수 없습니다." };
        }

        try {
            const res = await fetch(`${API_URL}/accounts/${accountId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${getAuthToken()}`
                }
            });

            if (!res.ok) {
                return { success: false, message: "계좌 삭제 실패" };
            }

            // 로컬 상태에서 제거
            setAccounts(prev => prev.filter(acc => acc.id !== accountId));
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, message: "계좌 삭제 실패 (네트워크 오류)" };
        }
    };

    return {
        accounts,
        fetchAccounts,
        isGuest,
        isLoading,
        addAsset,
        updateAsset,
        deleteAsset,
        updateCash,
        fetchAssetInfo,
        createAccount,
        updateAccountName,
        deleteAccount,
        updateAllPrices
    };
};
