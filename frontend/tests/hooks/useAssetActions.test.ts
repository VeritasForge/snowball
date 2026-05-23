import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAssetActions } from '../../src/lib/hooks/useAssetActions';
import { usePortfolioStore } from '../../src/lib/store';
import { useAuthStore } from '../../src/lib/auth';
import { Account } from '../../src/types';

const originalFetch = global.fetch;

const makeAccount = (overrides: Partial<Account> = {}): Account => ({
  id: 1,
  name: '테스트 계좌',
  cash: 100000,
  assets: [],
  total_asset_value: 100000,
  total_invested_value: 0,
  total_pl_amount: 0,
  total_pl_rate: 0,
  ...overrides,
});

const makeAsset = (overrides = {}) => ({
  id: 1,
  account_id: 1,
  name: '삼성전자',
  code: '005930',
  category: '주식',
  target_weight: 50,
  current_price: 70000,
  avg_price: 65000,
  quantity: 10,
  current_value: 700000,
  invested_amount: 650000,
  pl_amount: 50000,
  pl_rate: 7.69,
  current_weight: 50,
  target_value: 700000,
  diff_value: 0,
  action: 'HOLD' as const,
  action_quantity: 0,
  ...overrides,
});

describe('useAssetActions', () => {
  let setAccounts: ReturnType<typeof vi.fn>;
  let fetchAccounts: ReturnType<typeof vi.fn>;
  let accounts: Account[];

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    useAuthStore.setState({ user: null, token: null, refreshToken: null, isAuthenticated: false });
    usePortfolioStore.getState().reset();
    global.fetch = originalFetch;
    accounts = [makeAccount({ assets: [makeAsset()] })];
    setAccounts = vi.fn();
    fetchAccounts = vi.fn().mockResolvedValue(undefined);
  });

  const renderActions = (isGuest: boolean, token: string | null = null) => {
    const getAuthToken = vi.fn().mockReturnValue(token);
    return renderHook(() =>
      useAssetActions({ isGuest, getAuthToken, accounts, setAccounts, fetchAccounts })
    );
  };

  // ---- addAsset ----
  test('[Happy] isGuest=true: addAsset이 store에 자산을 추가한다', async () => {
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.addAsset(1, { name: '애플', category: '주식' });
    });
    const storeAssets = usePortfolioStore.getState().assets;
    expect(storeAssets.some(a => a.name === '애플')).toBe(true);
  });

  test('[Happy] isGuest=false: addAsset이 API를 호출한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await result.current.addAsset(1, { name: '애플', category: '주식' });
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assets'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(fetchAccounts).toHaveBeenCalled();
  });

  test('[Boundary] isGuest=true: addAsset에 빈 이름이 들어오면 기본값 "새 종목"을 사용한다', async () => {
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.addAsset(1, {});
    });
    const storeAssets = usePortfolioStore.getState().assets;
    expect(storeAssets.some(a => a.name === '새 종목')).toBe(true);
  });

  test('[Error] isGuest=false: addAsset API 에러 시 크래시 없음', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await expect(result.current.addAsset(1, { name: 'X' })).resolves.not.toThrow();
    });
  });

  test('[Boundary] isGuest=false: addAsset에 name/category 없을 때 기본값 사용 (line 33 ?? 브랜치)', async () => {
    // covers: asset.name ?? '' and asset.category ?? '주식' false branches
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      // name=undefined, category=undefined → triggers ?? '' and ?? '주식'
      await result.current.addAsset(1, {});
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assets'),
      expect.objectContaining({
        body: expect.stringContaining('"name":""'),
      })
    );
  });

  // ---- updateAsset ----
  test('[Happy] updateAsset이 accounts 상태를 업데이트한다', async () => {
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'name', '새 이름');
    });
    expect(setAccounts).toHaveBeenCalled();
  });

  test('[Happy] isGuest=true: updateAsset이 store 자산도 업데이트한다 (numeric values)', async () => {
    // Populate store so storeAssets.find can find the asset
    usePortfolioStore.setState({
      assets: [{ id: 1, name: '삼성전자', code: '005930', category: '주식', targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10 }],
      cash: 0,
    });
    const { result } = renderActions(true);
    await act(async () => {
      // Number values → false branch of typeof value === 'string'
      await result.current.updateAsset(1, 'targetRatio', 60);
      await result.current.updateAsset(1, 'avgPrice', 70000);
      await result.current.updateAsset(1, 'price', 80000);
      await result.current.updateAsset(1, 'qty', 20);
      await result.current.updateAsset(1, 'name', '삼성전자 신');
      await result.current.updateAsset(1, 'category', '채권');
      await result.current.updateAsset(1, 'code', 'AAPL');
    });
    expect(setAccounts).toHaveBeenCalled();
    const storeAssets = usePortfolioStore.getState().assets;
    expect(storeAssets[0].name).toBe('삼성전자 신');
  });

  test('[Happy] isGuest=true: updateAsset string values로 store 업데이트 (string branches)', async () => {
    usePortfolioStore.setState({
      assets: [{ id: 1, name: '삼성전자', code: '005930', category: '주식', targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10 }],
      cash: 0,
    });
    const { result } = renderActions(true);
    await act(async () => {
      // String values → true branch of typeof value === 'string'
      await result.current.updateAsset(1, 'targetRatio', '65');
      await result.current.updateAsset(1, 'avgPrice', '71000');
      await result.current.updateAsset(1, 'price', '81000');
      await result.current.updateAsset(1, 'qty', '25');
    });
    const storeAssets = usePortfolioStore.getState().assets;
    expect(storeAssets[0].targetWeight).toBe(65);
  });

  test('[Boundary] isGuest=true: updateAsset string "0" 값 → parseFloat("0") || 0 false 브랜치 커버', async () => {
    // parseFloat("0") === 0 → falsy → || 0 branch (false side of || operator)
    usePortfolioStore.setState({
      assets: [{ id: 1, name: '삼성전자', code: '005930', category: '주식', targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10 }],
      cash: 0,
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'targetRatio', '0');
      await result.current.updateAsset(1, 'avgPrice', '0');
      await result.current.updateAsset(1, 'price', '0');
      await result.current.updateAsset(1, 'qty', '0');
    });
    const storeAssets = usePortfolioStore.getState().assets;
    expect(storeAssets[0].targetWeight).toBe(0);
    expect(storeAssets[0].avgPrice).toBe(0);
    expect(storeAssets[0].currentPrice).toBe(0);
    expect(storeAssets[0].quantity).toBe(0);
  });

  test('[Boundary] isGuest=false: updateAsset string "0" 값 → line 87 branch cover', async () => {
    // typeof '0' === 'string' && ['price',...].includes('price') → true → parseFloat('0'.replace(/,/g,'')) || 0
    // parseFloat('0') = 0 → falsy → || 0 (covers the false branch of || in line 87)
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await result.current.updateAsset(1, 'price', '0');
      await result.current.updateAsset(1, 'avgPrice', '0');
      await result.current.updateAsset(1, 'qty', '0');
      await result.current.updateAsset(1, 'targetRatio', '0');
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  test('[Happy] isGuest=false: updateAsset이 API를 호출한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await result.current.updateAsset(1, 'name', '새 이름');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assets/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  test('[Boundary] updateAsset: targetRatio 필드 업데이트 시 target_weight가 변경된다', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'targetRatio', 60);
    });
    expect(setAccounts).toHaveBeenCalled();
    if (captured) {
      expect((captured[0] as Account).assets[0].target_weight).toBe(60);
    }
  });

  test('[Boundary] updateAsset: price 필드 업데이트 시 current_price가 변경된다', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'price', 80000);
    });
    if (captured) {
      expect((captured[0] as Account).assets[0].current_price).toBe(80000);
    }
  });

  test('[Boundary] updateAsset: avgPrice 필드 업데이트 시 avg_price가 변경된다', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'avgPrice', 70000);
    });
    if (captured) {
      expect((captured[0] as Account).assets[0].avg_price).toBe(70000);
    }
  });

  test('[Boundary] updateAsset: qty 필드 업데이트', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'qty', 20);
    });
    if (captured) {
      expect((captured[0] as Account).assets[0].quantity).toBe(20);
    }
  });

  test('[Boundary] updateAsset: category 필드 업데이트', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'category', '채권');
    });
    if (captured) {
      expect((captured[0] as Account).assets[0].category).toBe('채권');
    }
  });

  test('[Boundary] updateAsset: code 필드 업데이트', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'code', 'AAPL');
    });
    if (captured) {
      expect((captured[0] as Account).assets[0].code).toBe('AAPL');
    }
  });

  test('[Boundary] updateAsset: 존재하지 않는 id는 accounts를 변경하지 않는다', async () => {
    let captured: Account[] | null = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      captured = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(999, 'name', '없는 자산');
    });
    if (captured) {
      expect((captured[0] as Account).assets[0].name).toBe('삼성전자');
    }
  });

  test('[Error] isGuest=false: updateAsset API 에러 시 크래시 없음', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await expect(result.current.updateAsset(1, 'name', 'X')).resolves.not.toThrow();
    });
  });

  test('[Boundary] isGuest=false: updateAsset string+price 필드 → parseFloat 처리 (branch 87)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      // String value + price field → true branch of typeof&&includes
      await result.current.updateAsset(1, 'price', '80,000');
      // Number value + price field → false branch of typeof&&includes
      await result.current.updateAsset(1, 'price', 80000);
    });
    expect(global.fetch).toHaveBeenCalled();
  });

  // ---- deleteAsset ----
  test('[Happy] isGuest=true: deleteAsset이 store에서 자산을 제거한다', async () => {
    usePortfolioStore.setState({
      assets: [{ id: 1, name: '삼성전자', code: '', category: '주식', targetWeight: 50, currentPrice: 70000, avgPrice: 65000, quantity: 10 }],
      cash: 0,
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.deleteAsset(1);
    });
    expect(usePortfolioStore.getState().assets).toHaveLength(0);
  });

  test('[Happy] isGuest=false: deleteAsset이 API를 호출한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await result.current.deleteAsset(1);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assets/1'),
      expect.objectContaining({ method: 'DELETE' })
    );
    expect(fetchAccounts).toHaveBeenCalled();
  });

  test('[Error] isGuest=false: deleteAsset API 에러 시 크래시 없음', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await expect(result.current.deleteAsset(1)).resolves.not.toThrow();
    });
  });

  // ---- updateCash ----
  test('[Happy] isGuest=true: updateCash가 store cash를 업데이트한다', async () => {
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateCash(1, 200000);
    });
    expect(usePortfolioStore.getState().cash).toBe(200000);
    expect(setAccounts).toHaveBeenCalled();
  });

  test('[Happy] updateCash: setAccounts 콜백이 acc.id 매칭 분기를 실행한다', async () => {
    // Use an actual setAccounts that executes the callback to cover lines 110-119
    let capturedResult: any = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      capturedResult = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateCash(1, 300000);
    });
    // Account with id=1 should have updated cash
    expect(capturedResult).not.toBeNull();
    expect(capturedResult[0].cash).toBe(300000);
  });

  test('[Boundary] updateCash: total=0일 때 current_weight=0 처리 (line 114 false 브랜치)', async () => {
    // total = 0 when assets have 0 current_value and numVal = 0
    const zeroAsset = makeAsset({ current_value: 0, current_price: 0 });
    const zeroAccount = makeAccount({ assets: [zeroAsset] });
    accounts = [zeroAccount];
    let capturedResult: any = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      capturedResult = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateCash(1, 0); // numVal=0 → total = 0+0 = 0
    });
    // total=0 → current_weight=0
    expect(capturedResult[0].assets[0].current_weight).toBe(0);
    // current_price=0 → action_quantity=0
    expect(capturedResult[0].assets[0].action_quantity).toBe(0);
  });

  test('[Boundary] updateCash: acc.id가 다를 때 acc를 그대로 반환한다', async () => {
    // Account with different id: should be returned unchanged
    const differentAccount = makeAccount({ id: 99, cash: 50000 });
    accounts = [differentAccount, makeAccount({ assets: [makeAsset()] })];
    let capturedResult: any = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      capturedResult = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateCash(1, 300000); // targets id=1
    });
    // id=99 account should be unchanged
    expect(capturedResult[0].cash).toBe(50000);
    // id=1 account should be updated
    expect(capturedResult[1].cash).toBe(300000);
  });

  test('[Happy] isGuest=false: updateCash가 API를 호출한다', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await result.current.updateCash(1, 200000);
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/accounts/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  test('[Boundary] updateCash: 문자열 숫자도 처리된다', async () => {
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateCash(1, '300,000');
    });
    expect(usePortfolioStore.getState().cash).toBe(300000);
  });

  test('[Boundary] updateCash: NaN이면 아무것도 하지 않는다', async () => {
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateCash(1, 'abc');
    });
    expect(setAccounts).not.toHaveBeenCalled();
  });

  test('[Error] isGuest=false: updateCash API 에러 시 크래시 없음', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await expect(result.current.updateCash(1, 100)).resolves.not.toThrow();
    });
  });

  // ---- fetchAssetInfo ----
  test('[Happy] fetchAssetInfo: 정상 응답 시 success=true 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'Apple Inc.', price: 200, category: '주식' }),
    });
    usePortfolioStore.setState({
      assets: [{ id: 1, name: 'AAPL', code: 'AAPL', category: '주식', targetWeight: 50, currentPrice: 0, avgPrice: 0, quantity: 0 }],
      cash: 0,
    });
    const { result } = renderActions(true);
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, 'AAPL');
    });
    expect(res.success).toBe(true);
    expect(res.name).toBe('Apple Inc.');
  });

  test('[Boundary] fetchAssetInfo: code가 빈 문자열이면 success=false 반환', async () => {
    const { result } = renderActions(true);
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, '');
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe('코드를 입력하세요.');
  });

  test('[Happy] fetchAssetInfo: isGuest=false 일 때 API 업데이트 호출', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'Apple Inc.', price: 200, category: '주식' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => ({}) });
    const { result } = renderActions(false, 'valid-token');
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, 'AAPL');
    });
    expect(res.success).toBe(true);
    expect(fetchAccounts).toHaveBeenCalled();
  });

  test('[Error] fetchAssetInfo: API 실패 시 success=false 반환', async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      text: async () => 'Not found',
    });
    const { result } = renderActions(true);
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, 'INVALID');
    });
    expect(res.success).toBe(false);
  });

  test('[Error] fetchAssetInfo: 네트워크 에러 시 success=false 반환', async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderActions(true);
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, 'AAPL');
    });
    expect(res.success).toBe(false);
    expect(res.message).toContain('Network error');
  });

  test('[Error] fetchAssetInfo: isGuest=false, asset 업데이트 실패 시 success=false', async () => {
    global.fetch = vi.fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'Apple', price: 200, category: '주식' }) })
      .mockResolvedValueOnce({ ok: false });
    const { result } = renderActions(false, 'valid-token');
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, 'AAPL');
    });
    expect(res.success).toBe(false);
  });

  test('[Error] fetchAssetInfo: 알 수 없는 에러 시 기본 메시지 반환', async () => {
    global.fetch = vi.fn().mockRejectedValue('string error');
    const { result } = renderActions(true);
    let res: any;
    await act(async () => {
      res = await result.current.fetchAssetInfo(1, 'AAPL');
    });
    expect(res.success).toBe(false);
    expect(res.message).toBe('정보를 찾을 수 없습니다.');
  });

  // ---- updateAsset with string value for numeric fields ----
  test('[Boundary] updateAsset: string 값이 숫자로 변환된다 (price)', async () => {
    global.fetch = vi.fn().mockResolvedValue({ ok: true });
    const { result } = renderActions(false, 'valid-token');
    await act(async () => {
      await result.current.updateAsset(1, 'price', '75,000');
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/assets/1'),
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  test('[Boundary] updateAsset: totalAssetValue=0 시 current_weight=0 처리 (line 61 false 브랜치)', async () => {
    // Asset with current_value=0 and account cash=0 → totalAssetValue=0
    const zeroAsset = makeAsset({ current_value: 0, current_price: 0, avg_price: 0 });
    const zeroAccount = makeAccount({ assets: [zeroAsset], cash: 0, total_asset_value: 0 });
    accounts = [zeroAccount];
    let capturedResult: any = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      capturedResult = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      // Update name so current_value stays 0
      await result.current.updateAsset(1, 'name', '제로 자산');
    });
    expect(capturedResult).not.toBeNull();
    // totalAssetValue = 0+0 = 0 → false branch → current_weight = 0
    expect(capturedResult[0].assets[0].current_weight).toBe(0);
    // current_price = 0 → false branch → action_quantity = 0
    expect(capturedResult[0].assets[0].action_quantity).toBe(0);
  });

  test('[Boundary] updateAsset: current_price=0 시 action_quantity=0 처리 (line 64 false 브랜치)', async () => {
    // Asset with some value but current_price=0
    const zeroPriceAsset = makeAsset({ current_price: 0, current_value: 0 });
    const account = makeAccount({ assets: [zeroPriceAsset], cash: 100000 });
    accounts = [account];
    let capturedResult: any = null;
    setAccounts = vi.fn().mockImplementation((fn: any) => {
      capturedResult = fn(accounts);
    });
    const { result } = renderActions(true);
    await act(async () => {
      await result.current.updateAsset(1, 'qty', 10);
    });
    expect(capturedResult).not.toBeNull();
    // current_price=0 → false branch → action_quantity=0
    expect(capturedResult[0].assets[0].action_quantity).toBe(0);
  });
});
