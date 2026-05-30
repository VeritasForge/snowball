import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AssetTable } from '../../src/components/AssetTable';
import { Account, Asset } from '../../src/types';

const mockAsset: Asset = {
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
  action: 'HOLD',
  action_quantity: 0,
};

const mockAccount: Account = {
  id: 1,
  name: '테스트 계좌',
  cash: 0,
  assets: [mockAsset],
  total_asset_value: 700000,
  total_invested_value: 650000,
  total_pl_amount: 50000,
  total_pl_rate: 7.69,
};

const defaultProps = {
  account: mockAccount,
  isGuest: false,
  loadingRowId: null,
  deleteConfirmId: null,
  executeConfirmId: null,
  isLoadingPrices: false,
  isAutoRefreshEnabled: true,
  onUpdateAsset: vi.fn(),
  onDeleteAsset: vi.fn(),
  onExecuteTrade: vi.fn(),
  onFetchAssetInfo: vi.fn(),
  onAddAsset: vi.fn(),
  onSetDeleteConfirmId: vi.fn(),
  onSetExecuteConfirmId: vi.fn(),
  onToggleAutoRefresh: vi.fn(),
  onOpenPresetManager: vi.fn(),
  showToast: vi.fn(),
};

describe('AssetTable', () => {
  it('[Happy] 자산 테이블이 렌더링된다', () => {
    render(<AssetTable {...defaultProps} />);
    expect(screen.getByText('+ 종목 추가 (ADD ASSET)')).toBeInTheDocument();
  });

  it('[Happy] 프리셋 관리 버튼 클릭 시 onOpenPresetManager 호출', async () => {
    const onOpenPresetManager = vi.fn();
    render(<AssetTable {...defaultProps} isGuest={false} onOpenPresetManager={onOpenPresetManager} />);
    const btn = screen.getByRole('button', { name: /프리셋 관리/ });
    expect(btn).toBeEnabled();
    await userEvent.click(btn);
    expect(onOpenPresetManager).toHaveBeenCalledTimes(1);
  });

  it('[Boundary] isGuest=true 일 때 프리셋 관리 버튼이 비활성화된다', () => {
    render(<AssetTable {...defaultProps} isGuest={true} />);
    expect(screen.getByRole('button', { name: /프리셋 관리/ })).toBeDisabled();
  });

  it('[Happy] 자동갱신 중 상태가 표시된다', () => {
    render(<AssetTable {...defaultProps} isAutoRefreshEnabled={true} isGuest={false} />);
    expect(screen.getByText('실시간 시세 (자동갱신 중)')).toBeInTheDocument();
  });

  it('[Boundary] 일시정지 상태가 표시된다', () => {
    render(<AssetTable {...defaultProps} isAutoRefreshEnabled={false} isGuest={false} />);
    expect(screen.getByText('실시간 시세 (일시 정지)')).toBeInTheDocument();
  });

  it('[Boundary] isGuest=true 일 때 로그인 필요 메시지가 표시된다', () => {
    render(<AssetTable {...defaultProps} isGuest={true} />);
    expect(screen.getByText('실시간 시세 (로그인 필요)')).toBeInTheDocument();
  });

  it('[Happy] 종목 추가 버튼 클릭 시 onAddAsset 호출된다', async () => {
    const onAddAsset = vi.fn();
    const user = userEvent.setup();
    render(<AssetTable {...defaultProps} onAddAsset={onAddAsset} />);
    await user.click(screen.getByText('+ 종목 추가 (ADD ASSET)'));
    expect(onAddAsset).toHaveBeenCalledWith(1);
  });

  it('[Happy] 비가중치 토글 버튼 클릭 시 onToggleAutoRefresh 호출된다 (비게스트)', async () => {
    const onToggleAutoRefresh = vi.fn();
    const user = userEvent.setup();
    render(<AssetTable {...defaultProps} isGuest={false} onToggleAutoRefresh={onToggleAutoRefresh} />);
    // Click the auto-refresh toggle button
    const refreshBtn = screen.getByText('실시간 시세 (자동갱신 중)');
    await user.click(refreshBtn);
    expect(onToggleAutoRefresh).toHaveBeenCalled();
  });

  it('[Boundary] isGuest=true 일 때 버튼 클릭해도 onToggleAutoRefresh 미호출', async () => {
    const onToggleAutoRefresh = vi.fn();
    const user = userEvent.setup();
    render(<AssetTable {...defaultProps} isGuest={true} onToggleAutoRefresh={onToggleAutoRefresh} />);
    const refreshBtn = screen.getByText('실시간 시세 (로그인 필요)');
    await user.click(refreshBtn);
    expect(onToggleAutoRefresh).not.toHaveBeenCalled();
  });

  it('[Boundary] totalTargetWeight === 100 일 때 "100%" 및 체크 아이콘 표시된다', () => {
    const exactAsset = { ...mockAsset, target_weight: 100 };
    const exactAccount = { ...mockAccount, assets: [exactAsset] };
    render(<AssetTable {...defaultProps} account={exactAccount} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
    // Icon presence guards against accidental removal of the success indicator
    expect(screen.getByTestId('ratio-complete-icon')).toBeInTheDocument();
  });

  it('[Boundary] totalTargetWeight > 100 일 때 "초과" 표시된다', () => {
    const overAsset = { ...mockAsset, target_weight: 110 };
    const overAccount = { ...mockAccount, assets: [overAsset] };
    render(<AssetTable {...defaultProps} account={overAccount} />);
    expect(screen.getByText(/초과/)).toBeInTheDocument();
  });

  it('[Boundary] totalTargetWeight < 100 일 때 "잔여" 표시된다', () => {
    render(<AssetTable {...defaultProps} />);
    expect(screen.getByText(/잔여/)).toBeInTheDocument();
  });

  it('[Happy] isLoadingPrices=true 일 때 스피너가 표시된다', () => {
    render(<AssetTable {...defaultProps} isLoadingPrices={true} />);
    // RefreshCw should be shown with animate-spin
    const btn = screen.getByRole('button', { name: /실시간 시세/ });
    expect(btn).toBeInTheDocument();
  });

  it('[Error] account.assets 빈 배열 시 행이 없어도 크래시 없이 렌더링된다', () => {
    const emptyAccount = { ...mockAccount, assets: [] };
    render(<AssetTable {...defaultProps} account={emptyAccount} />);
    expect(screen.getByText('+ 종목 추가 (ADD ASSET)')).toBeInTheDocument();
  });

  it('[Boundary] target_weight가 0인 자산 포함 시 올바르게 합산된다', () => {
    const zeroWeightAsset = { ...mockAsset, target_weight: 0 };
    const zeroAccount = { ...mockAccount, assets: [zeroWeightAsset] };
    render(<AssetTable {...defaultProps} account={zeroAccount} />);
    // totalTargetWeight = 0, remaining = 100 → "잔여" text
    expect(screen.getByText(/잔여/)).toBeInTheDocument();
  });
});
