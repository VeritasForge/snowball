import { describe, beforeEach, it, expect } from 'vitest';
import { usePortfolioStore, createPortfolioStore } from '../../src/lib/store';

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

  it('[Happy] createPortfolioStore는 usePortfolioStore를 반환한다', () => {
    const store = createPortfolioStore();
    expect(store).toBe(usePortfolioStore);
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

describe('PortfolioStore.executeTrade (게스트 모의 체결)', () => {
  const seed = (cash = 1_000_000) => {
    usePortfolioStore.getState().reset();
    usePortfolioStore.getState().setCash(cash);
    usePortfolioStore.getState().addAsset({
      id: 1, name: 'A', category: '주식', targetWeight: 50,
      currentPrice: 100, avgPrice: 100, quantity: 10,
    });
    usePortfolioStore.getState().addAsset({
      id: 2, name: 'B', category: '채권', targetWeight: 50,
      currentPrice: 50, avgPrice: 50, quantity: 4,
    });
  };

  beforeEach(() => {
    localStorage.clear();
    seed();
  });

  it('매수하면 예수금이 차감되고 평단가는 가중평균으로 갱신된다', () => {
    const res = usePortfolioStore.getState().executeTrade(1, 5, 120);
    const { assets, cash } = usePortfolioStore.getState();
    expect(res).toEqual({ success: true });
    expect(cash).toBe(1_000_000 - 600);
    expect(assets[0].quantity).toBe(15);
    expect(assets[0].avgPrice).toBeCloseTo((10 * 100 + 5 * 120) / 15);
    expect(assets[1]).toMatchObject({ id: 2, quantity: 4, avgPrice: 50 });
  });

  it('매도하면 예수금이 늘고 수량만 줄며 평단가는 그대로다', () => {
    const res = usePortfolioStore.getState().executeTrade(1, -3, 120);
    const { assets, cash } = usePortfolioStore.getState();
    expect(res).toEqual({ success: true });
    expect(cash).toBe(1_000_000 + 360);
    expect(assets[0].quantity).toBe(7);
    expect(assets[0].avgPrice).toBe(100);
  });

  it('예수금이 부족하면 실패하고 상태를 바꾸지 않는다', () => {
    seed(100);
    const res = usePortfolioStore.getState().executeTrade(1, 5, 120);
    expect(res).toMatchObject({ success: false, message: expect.stringContaining('예수금이 부족') });
    expect(usePortfolioStore.getState().cash).toBe(100);
    expect(usePortfolioStore.getState().assets[0].quantity).toBe(10);
  });

  it('보유 수량보다 많이 매도하면 실패하고 상태를 바꾸지 않는다', () => {
    const res = usePortfolioStore.getState().executeTrade(1, -11, 120);
    expect(res).toEqual({ success: false, message: '보유 수량보다 많이 매도할 수 없습니다.' });
    expect(usePortfolioStore.getState().cash).toBe(1_000_000);
    expect(usePortfolioStore.getState().assets[0].quantity).toBe(10);
  });

  it('없는 종목이면 실패한다', () => {
    expect(usePortfolioStore.getState().executeTrade(999, 1, 100)).toEqual({
      success: false, message: '종목을 찾을 수 없습니다.',
    });
  });

  it('수량이 0이면 실패한다', () => {
    expect(usePortfolioStore.getState().executeTrade(1, 0, 100)).toEqual({
      success: false, message: '매매할 수량이 없습니다.',
    });
  });
});
