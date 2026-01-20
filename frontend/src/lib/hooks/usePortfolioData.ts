import { useState, useEffect, useCallback } from 'react';
import { usePortfolioStore, Asset as StoreAsset } from '../store';
import { useAuthStore, refreshAccessToken } from '../auth';
import { Account, Asset } from '../../types';

const API_URL = "http://localhost:8000/api/v1";

// Fetch wrapper with automatic token refresh on 401 error
const fetchWithAuth = async (url: string, options: RequestInit = {}): Promise<Response> => {
    const token = localStorage.getItem('access_token');
    const headers = {
        ...options.headers,
        'Authorization': `Bearer ${token}`
    };

    let res = await fetch(url, { ...options, headers });

    // Refresh token and retry on 401 error
    if (res.status === 401) {
        const newToken = await refreshAccessToken();
        if (newToken) {
            const retryHeaders = {
                ...options.headers,
                'Authorization': `Bearer ${newToken}`
            };
            res = await fetch(url, { ...options, headers: retryHeaders });
        } else {
            // Logout if refresh fails
            useAuthStore.getState().logout();
            window.location.href = '/auth';
        }
    }

    return res;
};

// Helper for basic calculation
const calculateAsset = (asset: StoreAsset, totalValue: number) => {
    const current_value = asset.currentPrice * asset.quantity;
    const invested_amount = asset.avgPrice * asset.quantity;
    const pl_amount = current_value - invested_amount;
    const pl_rate = asset.avgPrice > 0 ? (pl_amount / invested_amount) * 100 : 0;
    
    const target_value = totalValue * (asset.targetWeight / 100);
    const diff_value = target_value - current_value;
    const action_quantity = asset.currentPrice > 0 ? Math.floor(diff_value / asset.currentPrice) : 0;

    return {
        ...asset,
        id: asset.id || Math.random(), // Temporary ID
        account_id: -1,
        target_weight: asset.targetWeight,
        current_price: asset.currentPrice,
        avg_price: asset.avgPrice,
        current_value,
        invested_amount,
        pl_amount,
        pl_rate,
        current_weight: totalValue > 0 ? (current_value / totalValue) * 100 : 0,
        target_value,
        diff_value,
        action: 'HOLD', // Simple logic
        action_quantity
    } as Asset;
};

export const usePortfolioData = () => {
    const { isAuthenticated, token } = useAuthStore();
    const isGuest = !isAuthenticated;

    // localStorage fallback for zustand hydration issues
    const getAuthToken = () => token || localStorage.getItem('access_token'); 
    
    // Select specific state to prevent unnecessary re-renders
    const assets = usePortfolioStore(state => state.assets);
    const cash = usePortfolioStore(state => state.cash);
    const storeAddAsset = usePortfolioStore(state => state.addAsset);
    const storeUpdateAsset = usePortfolioStore(state => state.updateAsset);
    const storeRemoveAsset = usePortfolioStore(state => state.removeAsset);
    const storeSetCash = usePortfolioStore(state => state.setCash);

    const [accounts, setAccounts] = useState<Account[]>([]);
    const [isLoading, setIsLoading] = useState(true); // Default true

    const fetchAccounts = useCallback(async () => {
        setIsLoading(true);
        try {
            if (isGuest) {
                // ... (Guest Logic)
                // (Omitted: Keep existing logic)
                const totalAssets = assets.reduce((sum, a) => sum + (a.currentPrice * a.quantity), 0);
                const totalValue = totalAssets + cash;
                const guestAssets = assets.map(a => calculateAsset(a, totalValue));
                const guestAccount: Account = {
                    id: -1,
                    name: "Guest Portfolio",
                    cash: cash,
                    assets: guestAssets,
                    total_asset_value: totalValue,
                    total_invested_value: assets.reduce((sum, a) => sum + (a.avgPrice * a.quantity), 0),
                    total_pl_amount: totalAssets - assets.reduce((sum, a) => sum + (a.avgPrice * a.quantity), 0),
                    total_pl_rate: 0
                };
                if (guestAccount.total_invested_value > 0) {
                    guestAccount.total_pl_rate = (guestAccount.total_pl_amount / guestAccount.total_invested_value) * 100;
                }
                setAccounts([guestAccount]);
            } else {
                // API Logic (Includes auto token refresh)
                const res = await fetchWithAuth(`${API_URL}/accounts`);
                if (res.ok) {
                    const data = await res.json();
                    setAccounts(data);
                }
            }
        } catch (e) {
            console.error("Fetch failed", e);
        } finally {
            setIsLoading(false);
        }
    }, [assets, cash, isGuest, token]);

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
                name: asset.name || "New Asset",
                category: asset.category || "Stock",
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
                        category: asset.category || "Stock"
                    })
                });
                fetchAccounts();
            } catch (e) { console.error(e); }
        }
    };

    const updateAsset = async (id: number, field: string, value: any) => {
        // 1. Optimistic Update (Update Local State Immediately)
        setAccounts(prevAccounts => {
            return prevAccounts.map(acc => {
                const assetIndex = acc.assets.findIndex(a => a.id === id);
                if (assetIndex === -1) return acc;

                const updatedAssets = [...acc.assets];
                // Handle type conversion for calculation
                let newVal = value;
                if (['target_weight', 'avg_price', 'current_price', 'quantity'].includes(field) || 
                    ['targetRatio', 'avgPrice', 'price', 'qty'].includes(field)) {
                     newVal = parseFloat(value) || 0;
                }

                // Map field names
                if (field === 'targetRatio') updatedAssets[assetIndex].target_weight = newVal;
                else if (field === 'avgPrice') updatedAssets[assetIndex].avg_price = newVal;
                else if (field === 'price') updatedAssets[assetIndex].current_price = newVal;
                else if (field === 'qty') updatedAssets[assetIndex].quantity = newVal;
                else if (field === 'name') updatedAssets[assetIndex].name = newVal;
                else if (field === 'category') updatedAssets[assetIndex].category = newVal;
                else if (field === 'code') updatedAssets[assetIndex].code = newVal;

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
            if (field === 'targetRatio') updatePayload.targetWeight = parseFloat(value) || 0;
            else if (field === 'avgPrice') updatePayload.avgPrice = parseFloat(value) || 0;
            else if (field === 'price') updatePayload.currentPrice = parseFloat(value) || 0;
            else if (field === 'qty') updatePayload.quantity = parseFloat(value) || 0;
            else if (field === 'name') updatePayload.name = value;
            else if (field === 'category') updatePayload.category = value;
            else if (field === 'code') updatePayload.code = value;
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

        // Optimistic Update - Update specific account and recalculate
        setAccounts(prev => prev.map(acc => {
            if (acc.id !== accountId) return acc;

            const updatedAssets = [...acc.assets];
            const totalAssetValue = updatedAssets.reduce((sum, item) => sum + item.current_value, 0) + numVal;

            // Recalculate weights, target values, and rebalancing quantities
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
        if (!code) return { success: false, message: "Please enter a code." };
        
        try {
            const headers: Record<string, string> = {};
            const authToken = getAuthToken();
            if (authToken) headers['Authorization'] = `Bearer ${authToken}`;
            
            console.log(`Fetching info for code: ${code}`);
            const res = await fetch(`${API_URL}/finance/lookup?code=${code}`, { headers });
            
            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Lookup failed: ${errText}`);
            }
            
            const data = await res.json();
            console.log("Lookup result:", data);
            
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
            return { success: false, message: error.message || "Info not found." };
        }
    };

    const createAccount = async (name: string) => {
        if (isGuest) {
            return { success: false, message: "Cannot add account in guest mode." };
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
                return { success: false, message: `Failed to create account: ${err}` };
            }

            const newAccount = await res.json();
            await fetchAccounts();
            return { success: true, id: newAccount.id };
        } catch (e) {
            console.error(e);
            return { success: false, message: "Failed to create account (Network Error)" };
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
            // Update accounts directly instead of calling fetchAccounts
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
            return { success: false, message: "Cannot delete account in guest mode." };
        }

        try {
            const res = await fetch(`${API_URL}/accounts/${accountId}`, {
                method: "DELETE",
                headers: {
                    "Authorization": `Bearer ${getAuthToken()}`
                }
            });

            if (!res.ok) {
                return { success: false, message: "Failed to delete account" };
            }

            // Remove from local state
            setAccounts(prev => prev.filter(acc => acc.id !== accountId));
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, message: "Failed to delete account (Network Error)" };
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
