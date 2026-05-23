import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AccountTabs } from '../../src/components/AccountTabs';
import { Account } from '../../src/types';

const mockAccounts: Account[] = [
  { id: 1, name: '계좌1', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 },
  { id: 2, name: '계좌2', cash: 0, assets: [], total_asset_value: 0, total_invested_value: 0, total_pl_amount: 0, total_pl_rate: 0 },
];

const defaultProps = {
  accounts: mockAccounts,
  activeAccountId: 1,
  isGuest: false,
  isAddingAccount: false,
  newAccountName: '',
  isSubmitting: false,
  onSelectAccount: vi.fn(),
  onStartAdding: vi.fn(),
  onCancelAdding: vi.fn(),
  onNameChange: vi.fn(),
  onCreateAccount: vi.fn(),
};

describe('AccountTabs', () => {
  it('[Happy] 계좌 탭 목록이 렌더링된다', () => {
    render(<AccountTabs {...defaultProps} />);
    expect(screen.getByText('계좌1')).toBeInTheDocument();
    expect(screen.getByText('계좌2')).toBeInTheDocument();
  });

  it('[Boundary] isGuest=true 일 때 null을 반환한다', () => {
    const { container } = render(<AccountTabs {...defaultProps} isGuest={true} />);
    expect(container.firstChild).toBeNull();
  });

  it('[Happy] 계좌 탭 클릭 시 onSelectAccount 호출된다', async () => {
    const onSelectAccount = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} onSelectAccount={onSelectAccount} />);
    await user.click(screen.getByText('계좌2'));
    expect(onSelectAccount).toHaveBeenCalledWith(2);
  });

  it('[Happy] 계좌 추가 버튼 클릭 시 onStartAdding 호출된다', async () => {
    const onStartAdding = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} onStartAdding={onStartAdding} />);
    await user.click(screen.getByText('계좌 추가'));
    expect(onStartAdding).toHaveBeenCalled();
  });

  it('[Happy] isAddingAccount=true 일 때 입력 폼이 표시된다', () => {
    render(<AccountTabs {...defaultProps} isAddingAccount={true} newAccountName="새 계좌" />);
    expect(screen.getByPlaceholderText('계좌명')).toBeInTheDocument();
  });

  it('[Happy] isAddingAccount=true 일 때 확인 버튼 클릭 시 onCreateAccount 호출된다', async () => {
    const onCreateAccount = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} isAddingAccount={true} newAccountName="새 계좌" onCreateAccount={onCreateAccount} />);
    const checkBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-primary'));
    if (checkBtn) await user.click(checkBtn);
    expect(onCreateAccount).toHaveBeenCalled();
  });

  it('[Happy] isAddingAccount=true 일 때 취소 버튼 클릭 시 onCancelAdding 호출된다', async () => {
    const onCancelAdding = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} isAddingAccount={true} onCancelAdding={onCancelAdding} />);
    // The cancel button has 'text-muted hover:text-foreground' but NOT 'border' (account tabs have 'border')
    const cancelBtn = screen.getAllByRole('button').find(
      btn => btn.className.includes('text-muted') && !btn.className.includes('border')
    );
    if (cancelBtn) await user.click(cancelBtn);
    expect(onCancelAdding).toHaveBeenCalled();
  });

  it('[Boundary] isAddingAccount=true, Enter 키 입력 시 onCreateAccount 호출된다', async () => {
    const onCreateAccount = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} isAddingAccount={true} newAccountName="새 계좌" onCreateAccount={onCreateAccount} />);
    const input = screen.getByPlaceholderText('계좌명');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onCreateAccount).toHaveBeenCalled();
  });

  it('[Boundary] isAddingAccount=true, Escape 키 입력 시 onCancelAdding 호출된다', async () => {
    const onCancelAdding = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} isAddingAccount={true} onCancelAdding={onCancelAdding} />);
    const input = screen.getByPlaceholderText('계좌명');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(onCancelAdding).toHaveBeenCalled();
  });

  it('[Boundary] 입력값 변경 시 onNameChange 호출된다', async () => {
    const onNameChange = vi.fn();
    const user = userEvent.setup();
    render(<AccountTabs {...defaultProps} isAddingAccount={true} onNameChange={onNameChange} />);
    const input = screen.getByPlaceholderText('계좌명');
    await user.type(input, 'A');
    expect(onNameChange).toHaveBeenCalled();
  });

  it('[Error] isSubmitting=true 일 때 확인 버튼이 비활성화된다', () => {
    render(<AccountTabs {...defaultProps} isAddingAccount={true} isSubmitting={true} />);
    const checkBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-primary'));
    expect(checkBtn).toBeDisabled();
  });

  it('[Boundary] 빈 accounts 배열일 때 탭 없이 추가 버튼만 표시된다', () => {
    render(<AccountTabs {...defaultProps} accounts={[]} />);
    expect(screen.getByText('계좌 추가')).toBeInTheDocument();
  });
});
