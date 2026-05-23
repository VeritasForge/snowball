import { describe, test, expect, beforeEach } from 'vitest';
import { usePortfolioStore } from '../../src/lib/store';

describe('usePortfolioStore', () => {
  beforeEach(() => {
    usePortfolioStore.getState().reset();
  });

  test('[Happy] addAsset이 자산을 추가한다', () => {
    usePortfolioStore.getState().addAsset({
      name: '삼성전자', code: '005930', category: '주식',
      targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10,
    });
    expect(usePortfolioStore.getState().assets).toHaveLength(1);
    expect(usePortfolioStore.getState().assets[0].name).toBe('삼성전자');
  });

  test('[Happy] addAsset에 id가 없으면 Date.now()로 id를 부여한다', () => {
    usePortfolioStore.getState().addAsset({
      name: '애플', code: 'AAPL', category: '주식',
      targetWeight: 30, currentPrice: 200, avgPrice: 180, quantity: 5,
    });
    const asset = usePortfolioStore.getState().assets[0];
    expect(asset.id).toBeDefined();
    expect(typeof asset.id).toBe('number');
  });

  test('[Boundary] addAsset에 id가 있으면 그대로 사용한다', () => {
    usePortfolioStore.getState().addAsset({
      id: 999,
      name: '구글', code: 'GOOGL', category: '주식',
      targetWeight: 20, currentPrice: 150, avgPrice: 140, quantity: 3,
    });
    expect(usePortfolioStore.getState().assets[0].id).toBe(999);
  });

  test('[Happy] updateAsset이 자산을 업데이트한다', () => {
    usePortfolioStore.getState().addAsset({
      id: 1,
      name: '삼성전자', code: '005930', category: '주식',
      targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10,
    });
    usePortfolioStore.getState().updateAsset(1, { name: '삼성SDI' });
    expect(usePortfolioStore.getState().assets[0].name).toBe('삼성SDI');
  });

  test('[Boundary] updateAsset: 존재하지 않는 id는 아무것도 변경하지 않는다', () => {
    usePortfolioStore.getState().addAsset({
      id: 1, name: '삼성전자', code: '005930', category: '주식',
      targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10,
    });
    usePortfolioStore.getState().updateAsset(999, { name: '없는자산' });
    expect(usePortfolioStore.getState().assets[0].name).toBe('삼성전자');
  });

  test('[Happy] removeAsset이 자산을 제거한다', () => {
    usePortfolioStore.getState().addAsset({
      id: 1, name: '삼성전자', code: '005930', category: '주식',
      targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10,
    });
    usePortfolioStore.getState().removeAsset(1);
    expect(usePortfolioStore.getState().assets).toHaveLength(0);
  });

  test('[Boundary] removeAsset: 빈 assets에서 제거해도 크래시 없음', () => {
    usePortfolioStore.getState().removeAsset(1);
    expect(usePortfolioStore.getState().assets).toHaveLength(0);
  });

  test('[Happy] setCash가 현금을 업데이트한다', () => {
    usePortfolioStore.getState().setCash(500000);
    expect(usePortfolioStore.getState().cash).toBe(500000);
  });

  test('[Boundary] setCash(0)이 0으로 설정된다', () => {
    usePortfolioStore.getState().setCash(0);
    expect(usePortfolioStore.getState().cash).toBe(0);
  });

  test('[Happy] reset이 상태를 초기화한다', () => {
    usePortfolioStore.getState().addAsset({
      id: 1, name: '삼성전자', code: '005930', category: '주식',
      targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10,
    });
    usePortfolioStore.getState().setCash(100000);
    usePortfolioStore.getState().reset();
    expect(usePortfolioStore.getState().assets).toHaveLength(0);
    expect(usePortfolioStore.getState().cash).toBe(0);
  });

  test('[Error] removeAsset: id가 일치하지 않는 것만 필터링된다', () => {
    usePortfolioStore.getState().addAsset({
      id: 1, name: '삼성전자', code: '005930', category: '주식',
      targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10,
    });
    usePortfolioStore.getState().addAsset({
      id: 2, name: '애플', code: 'AAPL', category: '주식',
      targetWeight: 30, currentPrice: 200, avgPrice: 180, quantity: 5,
    });
    usePortfolioStore.getState().removeAsset(1);
    expect(usePortfolioStore.getState().assets).toHaveLength(1);
    expect(usePortfolioStore.getState().assets[0].name).toBe('애플');
  });
});
