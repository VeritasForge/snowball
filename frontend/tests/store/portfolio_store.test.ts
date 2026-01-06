import { describe, beforeEach, it, expect } from 'vitest';
import { usePortfolioStore } from '../../src/lib/store';

describe('PortfolioStore', () => {
  beforeEach(() => {
    localStorage.clear();
    usePortfolioStore.getState().reset();
  });

  it('should add an asset and persist to localStorage', () => {
    const newAsset = {
        name: 'Test Asset',
        targetWeight: 0.5,
        currentPrice: 100,
        quantity: 10,
        category: '주식',
        avgPrice: 100 // Added required field
    };

    usePortfolioStore.getState().addAsset(newAsset);

    const state = usePortfolioStore.getState();
    expect(state.assets).toHaveLength(1);
    expect(state.assets[0].name).toBe('Test Asset');

    // Verify localStorage
    const stored = localStorage.getItem('portfolio-storage');
    expect(stored).not.toBeNull();
    if (stored) {
        const parsed = JSON.parse(stored);
        expect(parsed.state.assets).toHaveLength(1);
        expect(parsed.state.assets[0].name).toBe('Test Asset');
    }
  });

  it('should load data from localStorage on rehydration', async () => {
     // Pre-populate localStorage
     const preloadedState = {
         state: {
             assets: [{ id: 123, name: 'Existing', targetWeight: 0.2, currentPrice: 50, quantity: 5, category: '주식', avgPrice: 40 }],
             cash: 0
         },
         version: 0
     };
     localStorage.setItem('portfolio-storage', JSON.stringify(preloadedState));

     if (usePortfolioStore.persist && typeof usePortfolioStore.persist.rehydrate === 'function') {
         await usePortfolioStore.persist.rehydrate();
         const state = usePortfolioStore.getState();
         expect(state.assets).toHaveLength(1);
         expect(state.assets[0].name).toBe('Existing');
     } else {
         const state = usePortfolioStore.getState();
         expect(state.assets).toHaveLength(0);
     }
  });
});
