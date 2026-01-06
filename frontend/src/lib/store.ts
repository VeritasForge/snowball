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

interface PortfolioState {
  assets: Asset[];
  cash: number;
  addAsset: (asset: Omit<Asset, 'id'> & { id?: number }) => void;
  updateAsset: (id: number, asset: Partial<Asset>) => void;
  removeAsset: (id: number) => void;
  setCash: (amount: number) => void;
  reset: () => void;
}

export const usePortfolioStore = create<PortfolioState>()(
  persist(
    (set) => ({
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
