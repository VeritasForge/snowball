import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { AccountHeader } from '../../src/components/AccountHeader';
import { Account } from '../../src/types';

const mockAccount: Account = {
  id: 1,
  name: '테스트 계좌',
  cash: 0,
  assets: [],
  total_asset_value: 0,
  total_invested_value: 0,
  total_pl_amount: 0,
  total_pl_rate: 0,
};

const defaultProps = {
  account: mockAccount,
  isGuest: false,
  isEditingName: false,
  tempName: '',
  onStartEditing: vi.fn(),
  onTempNameChange: vi.fn(),
  onConfirmEdit: vi.fn(),
  onCancelEdit: vi.fn(),
  onDeleteAccount: vi.fn(),
};

describe('AccountHeader', () => {
  it('[Happy] 계좌명이 표시된다', () => {
    render(<AccountHeader {...defaultProps} />);
    expect(screen.getByText('테스트 계좌 현황')).toBeInTheDocument();
  });

  it('[Happy] isGuest=false 일 때 삭제 버튼이 표시된다', () => {
    render(<AccountHeader {...defaultProps} isGuest={false} />);
    expect(screen.getByText('계좌 삭제')).toBeInTheDocument();
  });

  it('[Boundary] isGuest=true 일 때 삭제 버튼이 숨겨진다', () => {
    render(<AccountHeader {...defaultProps} isGuest={true} />);
    expect(screen.queryByText('계좌 삭제')).not.toBeInTheDocument();
  });

  it('[Happy] 편집 아이콘 클릭 시 onStartEditing 호출된다', async () => {
    const onStartEditing = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} onStartEditing={onStartEditing} />);
    // Find the Edit2 icon button (text-muted button that is not the delete button)
    const editButtons = screen.getAllByRole('button');
    const iconBtn = editButtons.find(btn => btn.className.includes('text-muted') && !btn.className.includes('text-danger'));
    if (iconBtn) await user.click(iconBtn);
    expect(onStartEditing).toHaveBeenCalled();
  });

  it('[Happy] isEditingName=true 일 때 입력 필드가 표시된다', () => {
    render(<AccountHeader {...defaultProps} isEditingName={true} tempName="수정 중" />);
    const input = screen.getByRole('textbox');
    expect(input).toBeInTheDocument();
    expect((input as HTMLInputElement).value).toBe('수정 중');
  });

  it('[Happy] 편집 중 확인 버튼 클릭 시 onConfirmEdit 호출된다', async () => {
    const onConfirmEdit = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} isEditingName={true} tempName="새 이름" onConfirmEdit={onConfirmEdit} />);
    const confirmBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-success'));
    if (confirmBtn) await user.click(confirmBtn);
    expect(onConfirmEdit).toHaveBeenCalled();
  });

  it('[Happy] 편집 중 취소 버튼 클릭 시 onCancelEdit 호출된다', async () => {
    const onCancelEdit = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} isEditingName={true} tempName="새 이름" onCancelEdit={onCancelEdit} />);
    const cancelBtn = screen.getAllByRole('button').find(btn => btn.className.includes('text-muted'));
    if (cancelBtn) await user.click(cancelBtn);
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('[Boundary] 편집 중 Enter 키 입력 시 onConfirmEdit 호출된다', async () => {
    const onConfirmEdit = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} isEditingName={true} tempName="새 이름" onConfirmEdit={onConfirmEdit} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Enter}');
    expect(onConfirmEdit).toHaveBeenCalled();
  });

  it('[Boundary] 편집 중 Escape 키 입력 시 onCancelEdit 호출된다', async () => {
    const onCancelEdit = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} isEditingName={true} tempName="새 이름" onCancelEdit={onCancelEdit} />);
    const input = screen.getByRole('textbox');
    await user.click(input);
    await user.keyboard('{Escape}');
    expect(onCancelEdit).toHaveBeenCalled();
  });

  it('[Boundary] 편집 중 텍스트 변경 시 onTempNameChange 호출된다', async () => {
    const onTempNameChange = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} isEditingName={true} tempName="" onTempNameChange={onTempNameChange} />);
    const input = screen.getByRole('textbox');
    await user.type(input, 'A');
    expect(onTempNameChange).toHaveBeenCalled();
  });

  it('[Error] 삭제 버튼 클릭 시 onDeleteAccount 호출된다', async () => {
    const onDeleteAccount = vi.fn();
    const user = userEvent.setup();
    render(<AccountHeader {...defaultProps} isGuest={false} onDeleteAccount={onDeleteAccount} />);
    await user.click(screen.getByText('계좌 삭제'));
    expect(onDeleteAccount).toHaveBeenCalled();
  });
});
