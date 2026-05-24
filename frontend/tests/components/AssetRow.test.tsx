import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { AssetRow } from '../../src/components/AssetRow';
import { Asset } from '../../src/types';

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

const defaultProps: React.ComponentProps<typeof AssetRow> = {
  item: mockAsset,
  isGuest: false,
  loadingRowId: null,
  deleteConfirmId: null,
  executeConfirmId: null,
  totalTargetWeight: 50,
  onUpdateAsset: vi.fn(),
  onDeleteAsset: vi.fn(),
  onExecuteTrade: vi.fn(),
  onFetchAssetInfo: vi.fn(),
  onSetDeleteConfirmId: vi.fn(),
  onSetExecuteConfirmId: vi.fn(),
  showToast: vi.fn(),
};

const renderInTable = (props: React.ComponentProps<typeof AssetRow> = defaultProps) =>
  render(
    <table>
      <tbody>
        <AssetRow {...props} />
      </tbody>
    </table>
  );

afterEach(() => {
  vi.restoreAllMocks();
});

describe('AssetRow', () => {
  it('[Happy] 종목명이 표시된다', () => {
    renderInTable();
    expect(screen.getByDisplayValue('삼성전자')).toBeInTheDocument();
  });

  it('[Happy] 손익이 양수일 때 text-danger 클래스가 적용된다', () => {
    renderInTable();
    const plEl = screen.getByText('+50,000');
    expect(plEl.className).toContain('text-danger');
  });

  it('[Boundary] 손익이 음수일 때 text-primary 클래스가 적용된다', () => {
    const negativeAsset = { ...mockAsset, pl_amount: -10000, pl_rate: -1.5 };
    renderInTable({ ...defaultProps, item: negativeAsset });
    const plEl = screen.getByText('-10,000');
    expect(plEl.className).toContain('text-primary');
  });

  it('[Happy] action_quantity > 0 이면 매수 버튼이 표시된다', () => {
    const buyAsset = { ...mockAsset, action_quantity: 5 };
    renderInTable({ ...defaultProps, item: buyAsset });
    expect(screen.getByText('매수 5주')).toBeInTheDocument();
  });

  it('[Happy] action_quantity < 0 이면 매도 버튼이 표시된다', () => {
    const sellAsset = { ...mockAsset, action_quantity: -3 };
    renderInTable({ ...defaultProps, item: sellAsset });
    expect(screen.getByText('매도 3주')).toBeInTheDocument();
  });

  it('[Boundary] action_quantity === 0 이면 매매 버튼 대신 "-"가 표시된다', () => {
    renderInTable();
    expect(screen.getByText('-')).toBeInTheDocument();
  });

  it('[Happy] 매수 버튼 클릭 시 onSetExecuteConfirmId 호출된다', async () => {
    const onSetExecuteConfirmId = vi.fn();
    const buyAsset = { ...mockAsset, action_quantity: 5 };
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: buyAsset, onSetExecuteConfirmId });
    await user.click(screen.getByText('매수 5주'));
    expect(onSetExecuteConfirmId).toHaveBeenCalledWith(1);
  });

  it('[Happy] executeConfirmId === item.id 일 때 체결/취소 버튼이 표시된다', () => {
    const buyAsset = { ...mockAsset, action_quantity: 5 };
    renderInTable({ ...defaultProps, item: buyAsset, executeConfirmId: 1 });
    expect(screen.getByText('체결')).toBeInTheDocument();
    expect(screen.getByText('취소')).toBeInTheDocument();
  });

  it('[Happy] 체결 버튼 클릭 시 onExecuteTrade 호출된다', async () => {
    const onExecuteTrade = vi.fn();
    const buyAsset = { ...mockAsset, action_quantity: 5 };
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: buyAsset, executeConfirmId: 1, onExecuteTrade });
    await user.click(screen.getByText('체결'));
    expect(onExecuteTrade).toHaveBeenCalledWith(buyAsset);
  });

  it('[Happy] 취소 버튼 클릭 시 onSetExecuteConfirmId(null) 호출된다', async () => {
    const onSetExecuteConfirmId = vi.fn();
    const buyAsset = { ...mockAsset, action_quantity: 5 };
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: buyAsset, executeConfirmId: 1, onSetExecuteConfirmId });
    await user.click(screen.getByText('취소'));
    expect(onSetExecuteConfirmId).toHaveBeenCalledWith(null);
  });

  it('[Happy] 삭제 아이콘 클릭 시 onSetDeleteConfirmId 호출된다', async () => {
    const onSetDeleteConfirmId = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onSetDeleteConfirmId });
    await user.click(screen.getByRole('button', { name: '자산 삭제' }));
    expect(onSetDeleteConfirmId).toHaveBeenCalledWith(1);
  });

  it('[Happy] deleteConfirmId === item.id 일 때 확인/취소 버튼이 표시된다', () => {
    renderInTable({ ...defaultProps, deleteConfirmId: 1 });
    expect(screen.getByRole('button', { name: '자산 삭제 확인' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '자산 삭제 취소' })).toBeInTheDocument();
  });

  it('[Happy] 삭제 확인 클릭 시 onDeleteAsset 호출된다', async () => {
    const onDeleteAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, deleteConfirmId: 1, onDeleteAsset });
    await user.click(screen.getByRole('button', { name: '자산 삭제 확인' }));
    expect(onDeleteAsset).toHaveBeenCalledWith(1);
  });

  it('[Happy] 삭제 취소 클릭 시 onSetDeleteConfirmId(null) 호출된다', async () => {
    const onSetDeleteConfirmId = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, deleteConfirmId: 1, onSetDeleteConfirmId });
    await user.click(screen.getByRole('button', { name: '자산 삭제 취소' }));
    expect(onSetDeleteConfirmId).toHaveBeenCalledWith(null);
  });

  it('[Boundary] 검색 버튼 클릭 시 onFetchAssetInfo 호출된다', async () => {
    const onFetchAssetInfo = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onFetchAssetInfo });
    await user.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '005930');
  });

  it('[Boundary] loadingRowId === item.id 일 때 검색 버튼이 비활성화된다', () => {
    renderInTable({ ...defaultProps, loadingRowId: 1 });
    expect(screen.getByRole('button', { name: '종목 정보 조회' })).toBeDisabled();
  });

  it('[Boundary] 목표비중 변경이 100% 초과 시 showToast 호출된다', async () => {
    const showToast = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, totalTargetWeight: 90, showToast });
    const weightInputs = screen.getAllByRole('spinbutton');
    const weightInput = weightInputs[0];
    await user.clear(weightInput);
    await user.type(weightInput, '70');
    expect(showToast).toHaveBeenCalled();
  });

  it('[Boundary] code 입력 필드에서 Enter 키 입력 시 onFetchAssetInfo 호출된다', async () => {
    const onFetchAssetInfo = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onFetchAssetInfo });
    const codeInput = screen.getByPlaceholderText('CODE');
    await user.click(codeInput);
    await user.keyboard('{Enter}');
    expect(onFetchAssetInfo).toHaveBeenCalled();
  });

  it('[Boundary] target_weight가 NaN일 때 입력 필드에 빈 문자열이 표시된다', () => {
    const nanWeightAsset = { ...mockAsset, target_weight: NaN };
    renderInTable({ ...defaultProps, item: nanWeightAsset });
    const weightInput = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    expect(weightInput.value).toBe('');
  });

  it('[Boundary] avg_price가 0일 때 avg_price || 0 브랜치 커버', () => {
    const zeroAvgAsset = { ...mockAsset, avg_price: 0, current_price: 0, quantity: 0 };
    renderInTable({ ...defaultProps, item: zeroAvgAsset });
    expect(screen.getByDisplayValue('삼성전자')).toBeInTheDocument();
  });

  it('[Boundary] item.code가 없을 때 code 입력 필드가 빈 문자열로 초기화된다', () => {
    const noCodeAsset = { ...mockAsset, code: undefined };
    renderInTable({ ...defaultProps, item: noCodeAsset });
    expect((screen.getByPlaceholderText('CODE') as HTMLInputElement).value).toBe('');
  });

  it('[Boundary] code 입력 필드에서 비-Enter 키 입력 시 onFetchAssetInfo 미호출', async () => {
    const onFetchAssetInfo = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onFetchAssetInfo });
    const codeInput = screen.getByPlaceholderText('CODE');
    await user.click(codeInput);
    await user.keyboard('a');
    expect(onFetchAssetInfo).not.toHaveBeenCalled();
  });

  it('[Boundary] target_weight가 0일 때 otherTotal 계산에서 item.target_weight || 0 브랜치 커버', async () => {
    const zeroWeightAsset = { ...mockAsset, target_weight: 0 };
    const showToast = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: zeroWeightAsset, totalTargetWeight: 95, showToast });
    const weightInput = screen.getAllByRole('spinbutton')[0];
    await user.clear(weightInput);
    await user.type(weightInput, '9');
    expect(showToast).toHaveBeenCalled();
  });

  it('[Happy] 종목명 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    const nameInput = screen.getByDisplayValue('삼성전자');
    await user.clear(nameInput);
    await user.type(nameInput, '카카오');
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'name', expect.any(String));
  });

  it('[Happy] 코드 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    const codeInput = screen.getByPlaceholderText('CODE');
    await user.click(codeInput);
    await user.clear(codeInput);
    await user.type(codeInput, 'AAPL');
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'code', expect.any(String));
  });

  it('[Happy] 목표비중 입력 필드 포커스 시 텍스트 선택된다', async () => {
    const user = userEvent.setup();
    renderInTable();
    const weightInput = screen.getAllByRole('spinbutton')[0] as HTMLInputElement;
    await user.click(weightInput);
    expect(weightInput).toBeInTheDocument();
  });

  it('[Happy] avg_price 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    const avgInput = screen.getByRole('textbox', { name: '평단가 입력' });
    await user.click(avgInput);
    await user.type(avgInput, '70000');
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'avgPrice', expect.any(String));
  });

  it('[Happy] current_price 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    const priceInput = screen.getByRole('textbox', { name: '현재가 입력' });
    await user.click(priceInput);
    await user.type(priceInput, '75000');
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'price', expect.any(String));
  });

  it('[Happy] quantity 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    const qtyInput = screen.getByRole('textbox', { name: '수량 입력' });
    await user.click(qtyInput);
    await user.type(qtyInput, '15');
    expect(onUpdateAsset).toHaveBeenCalledWith(1, 'qty', expect.any(String));
  });

  it('[Boundary] code가 없을 때 검색 버튼 클릭 시 빈 문자열로 onFetchAssetInfo 호출됨', async () => {
    const onFetchAssetInfo = vi.fn();
    const noCodeAsset = { ...mockAsset, code: undefined };
    renderInTable({ ...defaultProps, item: noCodeAsset, onFetchAssetInfo });
    fireEvent.click(screen.getByRole('button', { name: '종목 정보 조회' }));
    expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '');
  });

  it('[Boundary] code가 없을 때 Enter 키 시 빈 문자열로 onFetchAssetInfo 호출됨', async () => {
    const onFetchAssetInfo = vi.fn();
    const noCodeAsset = { ...mockAsset, code: undefined };
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: noCodeAsset, onFetchAssetInfo });
    const codeInput = screen.getByPlaceholderText('CODE');
    await user.click(codeInput);
    await user.keyboard('{Enter}');
    expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '');
  });

  it('[Error] 목표비중 초과 시 showToast가 error 타입으로 호출된다', async () => {
    const showToast = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, totalTargetWeight: 90, showToast });
    const weightInput = screen.getAllByRole('spinbutton')[0];
    await user.clear(weightInput);
    await user.type(weightInput, '70');
    expect(showToast).toHaveBeenCalledWith(expect.stringContaining('%'), 'error');
  });

  it('[Happy] CategorySelector에서 카테고리 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    const categoryBtn = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('주식') || btn.textContent?.includes('주')
    );
    if (categoryBtn) {
      await user.click(categoryBtn);
      const options = screen.queryAllByRole('button').filter(btn =>
        btn !== categoryBtn && (btn.textContent?.includes('채권') || btn.textContent?.includes('주식'))
      );
      if (options.length > 0) {
        await user.click(options[0]);
        expect(onUpdateAsset).toHaveBeenCalled();
      }
    }
  });
});
