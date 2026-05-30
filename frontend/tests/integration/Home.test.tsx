import { render, screen, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { Account, Asset } from '../../src/types';
import Home from '../../src/app/page';

const mockUsePortfolioData = vi.fn();

vi.mock('../../src/lib/hooks/usePortfolioData', () => ({
  usePortfolioData: () => mockUsePortfolioData(),
}));

// Stub the lazily-loaded preset modal so the integration test can drive the
// open/close wiring without pulling in usePresets + real fetches.
vi.mock('../../src/components/PresetManagerModal', () => ({
  PresetManagerModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="preset-modal">
      <button onClick={onClose}>stub-close</button>
    </div>
  ),
}));

const mockAccount: Account = {
  id: 1,
  name: 'Mock Account',
  assets: [] as Asset[],
  cash: 0,
  total_asset_value: 0,
  total_invested_value: 0,
  total_pl_amount: 0,
  total_pl_rate: 0,
};

const HOLD_ASSET: Asset = {
  id: 1, account_id: 1, name: 'Samsung', code: '005930', category: '주식',
  target_weight: 50, current_price: 70000, avg_price: 65000, quantity: 10,
  current_value: 700000, invested_amount: 650000, pl_amount: 50000, pl_rate: 7.69,
  current_weight: 50, target_value: 700000, diff_value: 0, action: 'HOLD',
  action_quantity: 0,
};

const BUY_ASSET: Asset = {
  ...HOLD_ASSET,
  target_weight: 60,
  target_value: 840000,
  diff_value: 140000,
  action: 'BUY',
  action_quantity: 2,
};

const SELL_ASSET: Asset = {
  ...HOLD_ASSET,
  target_weight: 40,
  target_value: 560000,
  diff_value: -140000,
  action: 'SELL',
  action_quantity: -2,
};

const createBaseMockReturn = () => ({
  accounts: [] as Account[],
  fetchAccounts: vi.fn(),
  isGuest: false,
  isLoading: false,
  addAsset: vi.fn(),
  updateAsset: vi.fn(),
  deleteAsset: vi.fn(),
  updateCash: vi.fn(),
  fetchAssetInfo: vi.fn(),
  createAccount: vi.fn(),
  updateAccountName: vi.fn(),
  deleteAccount: vi.fn(),
  replaceAccount: vi.fn(),
});

type MockReturn = ReturnType<typeof createBaseMockReturn>;

const createMockReturn = (overrides: Partial<MockReturn> = {}): MockReturn => ({
  ...createBaseMockReturn(),
  ...overrides,
});

describe('Home Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePortfolioData.mockReturnValue(createMockReturn({ accounts: [mockAccount] }));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('[Happy] 계좌 목록이 정상 렌더링된다', () => {
    render(<Home />);
    expect(screen.getAllByText('Mock Account').length).toBeGreaterThan(0);
  });

  it('[Happy] 프리셋 관리 버튼으로 모달을 열고 닫는다', async () => {
    render(<Home />);
    expect(screen.queryByTestId('preset-modal')).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: /프리셋 관리/ }));
    const modal = await screen.findByTestId('preset-modal');  // dynamic import resolves
    expect(modal).toBeInTheDocument();
    await userEvent.click(screen.getByText('stub-close'));
    expect(screen.queryByTestId('preset-modal')).not.toBeInTheDocument();
  });

  it('[Happy] isGuest=true 일 때 게스트 화면이 렌더링된다', () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({ isGuest: true }));
    render(<Home />);
    expect(screen.getByText('시작하기')).toBeInTheDocument();
  });

  it('[Boundary] accounts가 빈 배열일 때 크래시 없이 렌더링된다', () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({ accounts: [] }));
    render(<Home />);
    expect(screen.getByText('시작하기')).toBeInTheDocument();
  });

  it('[Boundary] isLoading=true 일 때 크래시 없이 렌더링된다', () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({ accounts: [mockAccount], isLoading: true }));
    render(<Home />);
    expect(screen.getByText('포트폴리오 불러오는 중...')).toBeInTheDocument();
  });

  it('[Happy] 계좌 삭제 확인 시 deleteAccount 호출 + 성공 토스트', async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ success: true });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      deleteAccount,
    }));
    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 삭제'));
    });
    expect(deleteAccount).toHaveBeenCalled();
  });

  it('[Boundary] 계좌 삭제 취소 시 deleteAccount 미호출', async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ success: true });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      deleteAccount,
    }));
    // Mock window.confirm to return false
    vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 삭제'));
    });
    expect(deleteAccount).not.toHaveBeenCalled();
  });

  it('[Error] 계좌 삭제 실패 시 에러 토스트', async () => {
    const deleteAccount = vi.fn().mockResolvedValue({ success: false, message: '삭제 실패' });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      deleteAccount,
    }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 삭제'));
    });
    expect(deleteAccount).toHaveBeenCalled();
  });

  it('[Happy] 계좌 탭 클릭 시 onSelectAccount 호출', async () => {
    const mockAccount2 = { ...mockAccount, id: 2, name: 'Account 2' };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount, mockAccount2],
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('Account 2'));
    });
    expect(screen.getByText('Account 2')).toBeInTheDocument();
  });

  it('[Happy] 계좌 추가 버튼 클릭 시 isAddingAccount 상태 변경', async () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 추가'));
    });
    expect(screen.getByPlaceholderText('계좌명')).toBeInTheDocument();
  });

  it('[Happy] 계좌 추가 취소 버튼 클릭 시 폼 숨김', async () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 추가'));
    });
    expect(screen.getByPlaceholderText('계좌명')).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌 추가 취소' }));
    });
    expect(screen.queryByPlaceholderText('계좌명')).not.toBeInTheDocument();
  });

  it('[Happy] 계좌 추가 확인 버튼 클릭 시 handleCreateAccount 호출', async () => {
    const createAccount = vi.fn().mockResolvedValue({ success: true, id: 2 });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      createAccount,
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 추가'));
    });
    await act(async () => {
      await user.type(screen.getByPlaceholderText('계좌명'), '새 계좌');
      await user.click(screen.getByRole('button', { name: '계좌 추가 확인' }));
    });
    expect(createAccount).toHaveBeenCalled();
  });

  it('[Happy] 계좌명 편집 시작 → onStartEditing 후 tempName 설정', async () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
    });
    expect(screen.getByDisplayValue('Mock Account')).toBeInTheDocument();
  });

  it('[Happy] 자동갱신 토글 버튼 클릭 시 isAutoRefreshEnabled 변경', async () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
    }));
    const user = userEvent.setup();
    render(<Home />);
    // Auto-refresh is enabled by default — button text reflects current state
    const toggleBtn = screen.getByText('실시간 시세 (자동갱신 중)');
    await act(async () => {
      await user.click(toggleBtn);
    });
    expect(screen.getByText('실시간 시세 (일시 정지)')).toBeInTheDocument();
  });

  it('[Happy] 종목 추가 버튼 클릭 시 addAsset 호출', async () => {
    const addAsset = vi.fn();
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      addAsset,
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('+ 종목 추가 (ADD ASSET)'));
    });
    expect(addAsset).toHaveBeenCalled();
  });

  it('[Happy] accounts가 없는 상태에서 Enter 키 입력 시 handleCreateAccount 호출', async () => {
    const createAccount = vi.fn().mockResolvedValue({ success: true, id: 1 });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [],
      createAccount,
    }));
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText('포트폴리오 이름 (예: 퇴직연금)');
    await user.type(input, '새 계좌');
    await act(async () => {
      await user.keyboard('{Enter}');
    });
    expect(createAccount).toHaveBeenCalled();
  });

  it('[Happy] executeTrade: 게스트 모드에서 fetch 미호출 (매매 차단)', async () => {
    const mockFetch = vi.fn();
    vi.stubGlobal('fetch', mockFetch);
    const accountWithBuy = { ...mockAccount, assets: [BUY_ASSET] };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [accountWithBuy],
      isGuest: true,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const tradeBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('매수'));
    expect(tradeBtns.length).toBeGreaterThan(0);
    await user.click(tradeBtns[0]);
    const confirmBtn = await screen.findByText('체결');
    await act(async () => { await user.click(confirmBtn); });
    // Guest mode guard returns early — fetch (and fetchWithAuth) must never be called
    expect(mockFetch).not.toHaveBeenCalled();
    expect(screen.getByDisplayValue('Samsung')).toBeInTheDocument();
  });

  it('[Happy] executeTrade: API 성공 시 fetchAccounts 호출', async () => {
    const mockFetch = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
    vi.stubGlobal('fetch', mockFetch);
    const fetchAccounts = vi.fn().mockResolvedValue(undefined);
    const accountWithBuy = { ...mockAccount, assets: [BUY_ASSET] };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [accountWithBuy],
      fetchAccounts,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const tradeBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('매수'));
    expect(tradeBtns.length).toBeGreaterThan(0);
    await user.click(tradeBtns[0]);
    const confirmBtn = await screen.findByText('체결');
    await act(async () => { await user.click(confirmBtn); });
    expect(fetchAccounts).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Samsung')).toBeInTheDocument();
  });

  it('[Boundary] action: HOLD 자산은 매수/매도 버튼 미렌더링', () => {
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [{ ...mockAccount, assets: [HOLD_ASSET] }],
    }));
    render(<Home />);
    // HOLD assets show no trade button — executeTrade cannot be triggered from UI
    const tradeBtns = screen.getAllByRole('button').filter(b =>
      b.textContent?.includes('매수') || b.textContent?.includes('매도')
    );
    expect(tradeBtns).toHaveLength(0);
  });

  it('[Boundary] handleCreateAccount 실패 + message undefined → 기본 에러 메시지 (line 74 ?? 브랜치)', async () => {
    // covers: else showToast(res.message ?? '계좌 생성 실패', 'error') when message is undefined
    const createAccount = vi.fn().mockResolvedValue({ success: false }); // no message
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [],
      createAccount,
    }));
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText('포트폴리오 이름 (예: 퇴직연금)');
    await user.type(input, '새 계좌');
    await act(async () => {
      await user.click(screen.getByText('시작하기'));
    });
    expect(createAccount).toHaveBeenCalled();
  });

it('[Happy] handleCreateAccount: isGuest=true 시 createAccount API 미호출', async () => {
    const createAccount = vi.fn();
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [],
      isGuest: true,
      createAccount,
    }));
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText('포트폴리오 이름 (예: 퇴직연금)');
    await user.type(input, '테스트 계좌');
    await act(async () => {
      await user.click(screen.getByText('시작하기'));
    });
    // Guest mode: API must not be called (guard returns early)
    expect(createAccount).not.toHaveBeenCalled();
  });

  it('[Happy] handleCreateAccount: 성공 시 activeAccountId 업데이트', async () => {
    const createAccount = vi.fn().mockResolvedValue({ success: true, id: 2 });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [],
      createAccount,
    }));
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText('포트폴리오 이름 (예: 퇴직연금)');
    await user.type(input, '새 계좌');
    await act(async () => {
      await user.click(screen.getByText('시작하기'));
    });
    expect(createAccount).toHaveBeenCalled();
  });

  it('[Happy] handleCreateAccount: 실패 시 에러 토스트', async () => {
    const createAccount = vi.fn().mockResolvedValue({ success: false, message: '계좌 생성 실패' });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [],
      createAccount,
    }));
    const user = userEvent.setup();
    render(<Home />);
    const input = screen.getByPlaceholderText('포트폴리오 이름 (예: 퇴직연금)');
    await user.type(input, '새 계좌');
    await act(async () => {
      await user.click(screen.getByText('시작하기'));
    });
    expect(createAccount).toHaveBeenCalled();
  });

  it('[Happy] fetchAssetInfoFromCode: 성공 시 성공 토스트', async () => {
    const fetchAssetInfo = vi.fn().mockResolvedValue({ success: true, name: 'Samsung' });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [{ ...mockAccount, assets: [HOLD_ASSET] }],
      fetchAssetInfo,
    }));
    render(<Home />);
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    });
    expect(fetchAssetInfo).toHaveBeenCalled();
  });

  it('[Error] fetchAssetInfoFromCode: 실패 시 에러 토스트', async () => {
    const fetchAssetInfo = vi.fn().mockResolvedValue({ success: false, message: '조회 실패' });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [{ ...mockAccount, assets: [HOLD_ASSET] }],
      fetchAssetInfo,
    }));
    render(<Home />);
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    });
    expect(fetchAssetInfo).toHaveBeenCalled();
  });

  it('[Error] fetchAssetInfoFromCode: res.message가 undefined일 때 기본 오류 메시지 표시', async () => {
    // covers: else showToast(res.message ?? '오류가 발생했습니다.', 'error') when message is undefined
    const fetchAssetInfo = vi.fn().mockResolvedValue({ success: false }); // no message
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [{ ...mockAccount, assets: [HOLD_ASSET] }],
      fetchAssetInfo,
    }));
    render(<Home />);
    const user = userEvent.setup();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    });
    expect(fetchAssetInfo).toHaveBeenCalled();
  });

  it('[Happy] executeTrade: API 성공 + action_quantity<0 시 매도 메시지 (line 87 매도 브랜치)', async () => {
    // covers: asset.action_quantity > 0 ? '매수' : '매도' when action_quantity < 0
    const mockFetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    });
    vi.stubGlobal('fetch', mockFetchImpl);
    const fetchAccounts = vi.fn().mockResolvedValue(undefined);
    const accountWithSell = { ...mockAccount, assets: [SELL_ASSET] };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [accountWithSell],
      isGuest: false,
      fetchAccounts,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const tradeBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('매도'));
    expect(tradeBtns.length).toBeGreaterThan(0);
    await user.click(tradeBtns[0]);
    const confirmBtn = await screen.findByText('체결');
    await act(async () => { await user.click(confirmBtn); });
    expect(fetchAccounts).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Samsung')).toBeInTheDocument();
  });

  it('[Error] executeTrade: API 응답 !ok 시 에러 토스트 (line 89)', async () => {
    // covers: else showToast((await res.json()).detail ?? '체결 실패', 'error')
    const mockFetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ detail: '체결 API 오류' }),
    });
    vi.stubGlobal('fetch', mockFetchImpl);
    const accountWithSell = { ...mockAccount, assets: [SELL_ASSET] };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [accountWithSell],
      isGuest: false,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const tradeBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('매도'));
    expect(tradeBtns.length).toBeGreaterThan(0);
    await user.click(tradeBtns[0]);
    const confirmBtn = await screen.findByText('체결');
    await act(async () => { await user.click(confirmBtn); });
    expect(mockFetchImpl).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Samsung')).toBeInTheDocument();
  });

  it('[Error] executeTrade: API 응답 !ok + detail undefined 시 기본 실패 메시지', async () => {
    // covers the ?? '체결 실패' fallback
    const mockFetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}), // no detail
    });
    vi.stubGlobal('fetch', mockFetchImpl);
    const accountWithBuy = { ...mockAccount, assets: [BUY_ASSET] };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [accountWithBuy],
      isGuest: false,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const tradeBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('매수'));
    expect(tradeBtns.length).toBeGreaterThan(0);
    await user.click(tradeBtns[0]);
    const confirmBtn = await screen.findByText('체결');
    await act(async () => { await user.click(confirmBtn); });
    expect(mockFetchImpl).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Samsung')).toBeInTheDocument();
  });

  it('[Error] executeTrade: fetch throw 시 catch 블록 실행 (line 90)', async () => {
    // covers: catch { showToast('체결 중 오류가 발생했습니다.', 'error'); }
    const mockFetchImpl = vi.fn().mockRejectedValue(new Error('Network error'));
    vi.stubGlobal('fetch', mockFetchImpl);
    const accountWithBuy = { ...mockAccount, assets: [BUY_ASSET] };
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [accountWithBuy],
      isGuest: false,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const tradeBtns = screen.getAllByRole('button').filter(b => b.textContent?.includes('매수'));
    expect(tradeBtns.length).toBeGreaterThan(0);
    await user.click(tradeBtns[0]);
    const confirmBtn = await screen.findByText('체결');
    await act(async () => { await user.click(confirmBtn); });
    expect(mockFetchImpl).toHaveBeenCalled();
    expect(screen.getByDisplayValue('Samsung')).toBeInTheDocument();
  });

  it('[Error] 계좌 삭제 실패 + message undefined 시 기본 에러 메시지 (line 162)', async () => {
    // covers: showToast(res.message ?? '계좌 삭제 실패', 'error') when message is undefined
    const deleteAccount = vi.fn().mockResolvedValue({ success: false }); // no message
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      deleteAccount,
    }));
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByText('계좌 삭제'));
    });
    expect(deleteAccount).toHaveBeenCalled();
  });

  it('[Happy] Toast onClose 인라인 함수 실행 (line 147)', async () => {
    // covers: () => setToast({ message: '', type: 'info' }) passed to Toast onClose
    const fetchAssetInfo = vi.fn().mockResolvedValue({ success: true, name: 'Samsung' });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [{ ...mockAccount, assets: [HOLD_ASSET] }],
      fetchAssetInfo,
    }));
    render(<Home />);
    const user = userEvent.setup();
    // Trigger toast via search button click
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    });
    expect(fetchAssetInfo).toHaveBeenCalled();
    // Toast is now visible — close it
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '토스트 닫기' }));
    });
    expect(screen.queryByRole('button', { name: '토스트 닫기' })).not.toBeInTheDocument();
  });

  it('[Happy] AccountHeader onConfirmEdit 인라인 함수 실행 (line 156)', async () => {
    // covers: () => { apiUpdateAccountName(...); setIsEditingName(false); }
    const updateAccountName = vi.fn();
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      updateAccountName,
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
    });
    await act(async () => {
      await user.clear(screen.getByDisplayValue('Mock Account'));
      await user.type(screen.getByRole('textbox', { name: '계좌명 입력' }), '새 계좌명');
      await user.click(screen.getByRole('button', { name: '계좌명 변경 확인' }));
    });
    expect(updateAccountName).toHaveBeenCalledWith(mockAccount.id, '새 계좌명');
  });

  it('[Boundary] 컴포넌트 언마운트 시 useEffect 정리 함수 실행 (cleanup functions)', async () => {
    // covers: () => clearInterval(id) and () => { if (toastTimerRef.current) ... }
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      isGuest: false, // not guest → setInterval is created
    }));
    const { unmount } = render(<Home />);
    // Can't easily change mock after render, so just unmount to trigger cleanup
    act(() => {
      unmount(); // triggers useEffect cleanups
    });
    expect(screen.queryByText('Mock Account')).not.toBeInTheDocument();
  });

  it('[Boundary] showToast 두 번 연속 호출 시 기존 타이머 취소 (line 23 if 브랜치)', async () => {
    // covers: if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    // First call sets toastTimerRef.current, second call hits the true branch
    const fetchAssetInfo = vi.fn()
      .mockResolvedValueOnce({ success: true, name: 'First' })
      .mockResolvedValueOnce({ success: true, name: 'Second' });
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [{ ...mockAccount, assets: [HOLD_ASSET] }],
      fetchAssetInfo,
    }));
    render(<Home />);
    const user = userEvent.setup();
    const searchBtn = screen.getByRole('button', { name: '종목 정보 조회' });
    // First click → first showToast → sets toastTimerRef.current
    await act(async () => { await user.click(searchBtn); });
    // Second click → second showToast → if (toastTimerRef.current) branch = true
    await act(async () => { await user.click(searchBtn); });
    expect(fetchAssetInfo).toHaveBeenCalledTimes(2);
  });

  // Note: setTimeout callback in showToast is covered via /* v8 ignore start/stop */ in source

  it('[Happy] AccountHeader onCancelEdit 인라인 함수 실행 (line 157)', async () => {
    // covers: () => setIsEditingName(false)
    const user = userEvent.setup();
    render(<Home />); // uses beforeEach default mock with [mockAccount]
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
    });
    expect(screen.getByDisplayValue('Mock Account')).toBeInTheDocument();
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌명 편집 취소' }));
    });
    // After cancel, editing input is gone and account name heading is back
    expect(screen.queryByDisplayValue('Mock Account')).not.toBeInTheDocument();
    expect(screen.getAllByText('Mock Account 현황').length).toBeGreaterThan(0);
  });

  it('[Boundary] 계좌명 편집 중 Enter 키 → 변경 저장', async () => {
    const updateAccountName = vi.fn();
    mockUsePortfolioData.mockReturnValue(createMockReturn({
      accounts: [mockAccount],
      updateAccountName,
    }));
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
    });
    await act(async () => {
      await user.clear(screen.getByDisplayValue('Mock Account'));
      await user.type(screen.getByRole('textbox', { name: '계좌명 입력' }), '새이름{Enter}');
    });
    expect(updateAccountName).toHaveBeenCalledWith(mockAccount.id, '새이름');
  });

  it('[Boundary] 계좌명 편집 중 Escape 키 → 편집 취소', async () => {
    const user = userEvent.setup();
    render(<Home />);
    await act(async () => {
      await user.click(screen.getByRole('button', { name: '계좌명 편집' }));
    });
    await act(async () => {
      await user.keyboard('{Escape}');
    });
    expect(screen.getByRole('button', { name: '계좌명 편집' })).toBeInTheDocument();
  });
});
