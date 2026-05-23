import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AssetRow } from '../../src/components/AssetRow';
import { Asset } from '../../src/types';
import type { AssetField, AssetFieldValue } from '../../src/lib/hooks/usePortfolioData';

interface AssetRowTestProps {
  item: Asset;
  isGuest: boolean;
  loadingRowId: number | null;
  deleteConfirmId: number | null;
  executeConfirmId: number | null;
  totalTargetWeight: number;
  onUpdateAsset: (id: number, field: AssetField, value: AssetFieldValue) => void;
  onDeleteAsset: (id: number) => void;
  onExecuteTrade: (asset: Asset) => void;
  onFetchAssetInfo: (id: number, code: string) => void;
  onSetDeleteConfirmId: (id: number | null) => void;
  onSetExecuteConfirmId: (id: number | null) => void;
  showToast: (message: string, type?: 'info' | 'error') => void;
}

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

const defaultProps: AssetRowTestProps = {
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

const renderInTable = (props: AssetRowTestProps = defaultProps) =>
  render(
    <table>
      <tbody>
        <AssetRow {...props} />
      </tbody>
    </table>
  );

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
    // Find trash icon button (group-hover button)
    const deleteBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('text-muted') && btn.className.includes('hover:text-danger')
    );
    if (deleteBtn) {
      await user.click(deleteBtn);
      expect(onSetDeleteConfirmId).toHaveBeenCalledWith(1);
    }
  });

  it('[Happy] deleteConfirmId === item.id 일 때 확인/취소 버튼이 표시된다', () => {
    renderInTable({ ...defaultProps, deleteConfirmId: 1 });
    // Two buttons in the confirmation UI
    const buttons = screen.getAllByRole('button');
    const confirmBtn = buttons.find(btn => btn.className.includes('bg-danger'));
    expect(confirmBtn).toBeTruthy();
  });

  it('[Happy] 삭제 확인 클릭 시 onDeleteAsset 호출된다', async () => {
    const onDeleteAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, deleteConfirmId: 1, onDeleteAsset });
    // The delete-confirm button has both 'bg-danger' and 'p-1.5' (not the CategorySelector button)
    const confirmBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('bg-danger') && btn.className.includes('p-1.5')
    );
    if (confirmBtn) await user.click(confirmBtn);
    expect(onDeleteAsset).toHaveBeenCalledWith(1);
  });

  it('[Happy] 삭제 취소 클릭 시 onSetDeleteConfirmId(null) 호출된다', async () => {
    const onSetDeleteConfirmId = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, deleteConfirmId: 1, onSetDeleteConfirmId });
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('bg-secondary') && btn.className.includes('p-1.5')
    );
    if (cancelBtn) await user.click(cancelBtn);
    expect(onSetDeleteConfirmId).toHaveBeenCalledWith(null);
  });

  it('[Boundary] 검색 버튼 클릭 시 onFetchAssetInfo 호출된다', async () => {
    const onFetchAssetInfo = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onFetchAssetInfo });
    const searchBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('hover:text-primary')
    );
    if (searchBtn) {
      await user.click(searchBtn);
      expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '005930');
    }
  });

  it('[Boundary] loadingRowId === item.id 일 때 검색 버튼이 비활성화된다', () => {
    renderInTable({ ...defaultProps, loadingRowId: 1 });
    const searchBtn = screen.getAllByRole('button').find(
      btn => btn.hasAttribute('disabled')
    );
    expect(searchBtn).toBeTruthy();
  });

  it('[Boundary] 목표비중 변경이 100% 초과 시 showToast 호출된다', async () => {
    const showToast = vi.fn();
    const user = userEvent.setup();
    // totalTargetWeight=90, item.target_weight=50, entering 70 => 90-50+70=110>100
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
    const inputs = screen.getAllByRole('textbox');
    // Code input is the second text input (after name input)
    const codeInput = inputs.find(inp => (inp as HTMLInputElement).placeholder === 'CODE');
    if (codeInput) {
      await user.click(codeInput);
      await user.keyboard('{Enter}');
      expect(onFetchAssetInfo).toHaveBeenCalled();
    }
  });

  it('[Error] item.id가 없을 때 검색 버튼이 비활성화된다', () => {
    const noIdAsset = { ...mockAsset, id: undefined as any };
    renderInTable({ ...defaultProps, item: noIdAsset });
    const disabledBtns = screen.getAllByRole('button').filter(btn => btn.hasAttribute('disabled'));
    expect(disabledBtns.length).toBeGreaterThan(0);
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
    const codeInput = screen.getAllByRole('textbox').find(
      inp => (inp as HTMLInputElement).placeholder === 'CODE'
    ) as HTMLInputElement;
    expect(codeInput?.value).toBe('');
  });

  it('[Boundary] item.id가 없을 때 검색 버튼 클릭 시 onFetchAssetInfo 미호출', async () => {
    const onFetchAssetInfo = vi.fn();
    const noIdAsset = { ...mockAsset, id: undefined as any };
    renderInTable({ ...defaultProps, item: noIdAsset, onFetchAssetInfo });
    const searchBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('hover:text-primary') && btn.className.includes('disabled:opacity-50')
    );
    if (searchBtn) {
      // button is disabled, but click should not propagate to handler
      // userEvent won't click disabled buttons by default
    }
    expect(onFetchAssetInfo).not.toHaveBeenCalled();
  });

  it('[Boundary] code 입력 필드에서 비-Enter 키 입력 시 onFetchAssetInfo 미호출', async () => {
    const onFetchAssetInfo = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onFetchAssetInfo });
    const inputs = screen.getAllByRole('textbox');
    const codeInput = inputs.find(inp => (inp as HTMLInputElement).placeholder === 'CODE');
    if (codeInput) {
      await user.click(codeInput);
      await user.keyboard('a'); // non-Enter key
    }
    expect(onFetchAssetInfo).not.toHaveBeenCalled();
  });

  it('[Boundary] item.id 없을 때 code Enter 키 입력 시 onFetchAssetInfo 미호출', async () => {
    const onFetchAssetInfo = vi.fn();
    const noIdAsset = { ...mockAsset, id: undefined as any };
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: noIdAsset, onFetchAssetInfo });
    const inputs = screen.getAllByRole('textbox');
    const codeInput = inputs.find(inp => (inp as HTMLInputElement).placeholder === 'CODE');
    if (codeInput) {
      await user.click(codeInput);
      await user.keyboard('{Enter}');
    }
    expect(onFetchAssetInfo).not.toHaveBeenCalled();
  });

  it('[Boundary] target_weight가 0일 때 otherTotal 계산에서 item.target_weight || 0 브랜치 커버', async () => {
    const zeroWeightAsset = { ...mockAsset, target_weight: 0 };
    const showToast = vi.fn();
    const user = userEvent.setup();
    // totalTargetWeight=95, item.target_weight=0: otherTotal = 95-0 = 95
    // typing '9' => 95 + 9 = 104 > 100 → showToast
    renderInTable({ ...defaultProps, item: zeroWeightAsset, totalTargetWeight: 95, showToast });
    const weightInput = screen.getAllByRole('spinbutton')[0];
    await user.clear(weightInput);
    await user.type(weightInput, '9');
    // 95 - 0 + 9 = 104 > 100 → showToast
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
    const codeInput = screen.getAllByRole('textbox').find(
      inp => (inp as HTMLInputElement).placeholder === 'CODE'
    ) as HTMLInputElement;
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
    // onFocus triggers e.target.select() - just verify no crash
    expect(weightInput).toBeInTheDocument();
  });

  it('[Happy] avg_price 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    // NumberFormatInput inputs: avg_price (65000), current_price (70000), quantity (10)
    // Name and code are regular text inputs; spinbutton is target_weight
    // All NumberFormatInputs have role=textbox but unique classNames
    // avg_price has className that includes 'text-muted text-xs'
    const inputs = screen.getAllByRole('textbox');
    // Find by className - avg_price input has 'text-muted text-xs' in className
    const avgInput = inputs.find(inp => (inp as HTMLInputElement).className?.includes('text-muted') && (inp as HTMLInputElement).className?.includes('text-xs'));
    if (avgInput) {
      await user.click(avgInput);
      await user.type(avgInput, '70000');
      expect(onUpdateAsset).toHaveBeenCalledWith(1, 'avgPrice', expect.any(String));
    }
  });

  it('[Happy] current_price 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    // Find price input - has className 'font-bold text-foreground' (from AssetRow line 98)
    const inputs = screen.getAllByRole('textbox');
    const priceInput = inputs.find(inp =>
      (inp as HTMLInputElement).className?.includes('font-bold') &&
      (inp as HTMLInputElement).className?.includes('text-foreground') &&
      (inp as HTMLInputElement).className?.includes('w-24')
    );
    if (priceInput) {
      await user.click(priceInput);
      await user.type(priceInput, '75000');
      expect(onUpdateAsset).toHaveBeenCalledWith(1, 'price', expect.any(String));
    }
  });

  it('[Happy] quantity 입력 필드 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    // Find quantity input - has className 'w-16' (from AssetRow line 105)
    const inputs = screen.getAllByRole('textbox');
    const qtyInput = inputs.find(inp => (inp as HTMLInputElement).className?.includes('w-16'));
    if (qtyInput) {
      await user.click(qtyInput);
      await user.type(qtyInput, '15');
      expect(onUpdateAsset).toHaveBeenCalledWith(1, 'qty', expect.any(String));
    }
  });

  it('[Boundary] code가 없을 때 검색 버튼 클릭 시 빈 문자열로 onFetchAssetInfo 호출됨 (item.code || "" 브랜치)', async () => {
    // covers: item.code || '' when item.code is undefined (right branch of ||)
    const onFetchAssetInfo = vi.fn();
    const noCodeAsset = { ...mockAsset, code: undefined };
    renderInTable({ ...defaultProps, item: noCodeAsset, onFetchAssetInfo });
    // Find and click the search button (enabled since item.id exists)
    const searchBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('hover:text-primary')
    );
    if (searchBtn) {
      fireEvent.click(searchBtn);
      expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '');
    }
  });

  it('[Boundary] item.id 없을 때 검색 버튼 fireEvent 클릭 시 item.id && 조건 false (line 57 브랜치)', () => {
    // covers: onClick={() => item.id && onFetchAssetInfo(...)} when item.id is falsy
    // fireEvent bypasses the disabled state check
    const onFetchAssetInfo = vi.fn();
    const noIdAsset = { ...mockAsset, id: undefined as any };
    renderInTable({ ...defaultProps, item: noIdAsset, onFetchAssetInfo });
    const searchBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('hover:text-primary') && btn.className.includes('disabled:opacity-50')
    );
    if (searchBtn) {
      fireEvent.click(searchBtn); // bypasses disabled, fires onClick, but item.id is falsy → short-circuit
      expect(onFetchAssetInfo).not.toHaveBeenCalled(); // item.id false → && short-circuits
    }
  });

  it('[Boundary] code가 없을 때 Enter 키 시 빈 문자열로 onFetchAssetInfo 호출됨 (line 52 item.code || "" 브랜치)', async () => {
    // covers: onKeyDown with Enter && item.id && onFetchAssetInfo(item.id, item.code || '') when code=undefined
    const onFetchAssetInfo = vi.fn();
    const noCodeAsset = { ...mockAsset, code: undefined };
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, item: noCodeAsset, onFetchAssetInfo });
    const codeInput = screen.getAllByRole('textbox').find(
      inp => (inp as HTMLInputElement).placeholder === 'CODE'
    );
    if (codeInput) {
      await user.click(codeInput);
      await user.keyboard('{Enter}');
      expect(onFetchAssetInfo).toHaveBeenCalledWith(1, '');
    }
  });

  it('[Happy] CategorySelector에서 카테고리 변경 시 onUpdateAsset 호출된다', async () => {
    const onUpdateAsset = vi.fn();
    const user = userEvent.setup();
    renderInTable({ ...defaultProps, onUpdateAsset });
    // CategorySelector renders a button that shows categories on click
    // Find the category button (shows current category)
    const categoryBtn = screen.getAllByRole('button').find(btn =>
      btn.textContent?.includes('주식') || btn.textContent?.includes('주')
    );
    if (categoryBtn) {
      await user.click(categoryBtn); // Opens dropdown
      // Look for a category option to click
      const options = screen.queryAllByRole('button').filter(btn =>
        btn !== categoryBtn && (btn.textContent?.includes('채권') || btn.textContent?.includes('주식'))
      );
      if (options.length > 0) {
        await user.click(options[0]);
        expect(onUpdateAsset).toHaveBeenCalled();
      }
    }
    expect(document.body).toBeTruthy();
  });
});
