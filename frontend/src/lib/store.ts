import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface Asset {
  id?: number; // Optional for guest
  name: string;
  code?: string;
  category: string;
  targetWeight: number;
  currentPrice: number;
  avgPrice: number;
  quantity: number;
}

export type TradeResult = { success: true } | { success: false; message: string };

interface PortfolioState {
  assets: Asset[];
  cash: number;
  addAsset: (asset: Omit<Asset, 'id'> & { id?: number }) => void;
  updateAsset: (id: number, asset: Partial<Asset>) => void;
  removeAsset: (id: number) => void;
  setCash: (amount: number) => void;
  /** 게스트 모의 체결. 백엔드 ExecuteTradeUseCase 와 같은 규칙을 브라우저 저장소에 적용한다. */
  executeTrade: (id: number, actionQuantity: number, price: number) => TradeResult;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set, get) => ({
      assets: [],
      cash: 0,
      addAsset: (asset) => set((state) => ({ 
        assets: [...state.assets, { ...asset, id: asset.id || Date.now() }] 
      })),
      updateAsset: (id, newAsset) => set((state) => ({
        assets: state.assets.map(a => a.id === id ? { ...a, ...newAsset } : a)
      })),
      removeAsset: (id) => set((state) => ({
        assets: state.assets.filter((a) => a.id !== id)
      })),
      setCash: (amount) => set({ cash: amount }),
      executeTrade: (id, actionQuantity, price) => {
        const { assets, cash } = get();
        const asset = assets.find((a) => a.id === id);
        if (!asset) return { success: false, message: '종목을 찾을 수 없습니다.' };
        if (!actionQuantity) return { success: false, message: '매매할 수량이 없습니다.' };

        const amount = Math.abs(actionQuantity) * price;
        const newQuantity = asset.quantity + actionQuantity;
        if (actionQuantity > 0 && cash < amount) {
          return {
            success: false,
            message: `예수금이 부족합니다. 필요 ${Math.round(amount).toLocaleString()}원, 보유 ${Math.round(cash).toLocaleString()}원`,
          };
        }
        if (newQuantity < 0) {
          return { success: false, message: '보유 수량보다 많이 매도할 수 없습니다.' };
        }

        const avgPrice = actionQuantity > 0
          ? (asset.quantity * asset.avgPrice + amount) / newQuantity
          : asset.avgPrice;
        set({
          cash: actionQuantity > 0 ? cash - amount : cash + amount,
          assets: assets.map((a) => (a.id === id ? { ...a, quantity: newQuantity, avgPrice } : a)),
        });
        return { success: true };
      },
      reset: () => set({ assets: [], cash: 0 })
    }),
    {
      name: 'portfolio-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // For Next.js SSR hydration mismatch avoidance, we handle hydration manually usually
    }
  )
);

// Helper for testing to create a fresh store instance if needed (but zustand is singleton usually)
// For unit testing pattern (createStore), we would export a factory.
// But typical usage is `usePortfolioStore`.
// The test used `createPortfolioStore`, so let's export that if we want testability without singleton state pollution.
// But for now, sticking to simple export.
export const createPortfolioStore = () => usePortfolioStore; 
