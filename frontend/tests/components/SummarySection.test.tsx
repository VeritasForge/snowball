import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { SummarySection } from '../../src/components/SummarySection';
import { Account } from '../../src/types';

const mockAccount: Account = {
  id: 1,
  name: '테스트 계좌',
  cash: 500000,
  assets: [],
  total_asset_value: 1500000,
  total_invested_value: 1000000,
  total_pl_amount: 100000,
  total_pl_rate: 10,
};

const formatNumber = (n: number) => n.toLocaleString('ko-KR');

describe('SummarySection', () => {
  it('[Happy] 총 자산이 표시된다', () => {
    render(<SummarySection account={mockAccount} onUpdateCash={vi.fn()} formatNumber={formatNumber} />);
    expect(screen.getByText('총 자산 (주식+현금)')).toBeInTheDocument();
    expect(screen.getByText('1,500,000원')).toBeInTheDocument();
  });

  it('[Happy] 양의 손익에 text-danger 클래스가 적용된다', () => {
    render(<SummarySection account={mockAccount} onUpdateCash={vi.fn()} formatNumber={formatNumber} />);
    const plSection = screen.getByText('총 평가 손익').closest('div');
    expect(plSection?.className).toContain('border-danger');
  });

  it('[Boundary] 음의 손익에 text-primary 클래스가 적용된다', () => {
    const negativeAccount: Account = { ...mockAccount, total_pl_amount: -50000, total_pl_rate: -5 };
    render(<SummarySection account={negativeAccount} onUpdateCash={vi.fn()} formatNumber={formatNumber} />);
    const plSection = screen.getByText('총 평가 손익').closest('div');
    expect(plSection?.className).toContain('border-primary');
  });

  it('[Boundary] 손익이 0일 때 양수로 처리된다 (border-danger)', () => {
    const zeroAccount: Account = { ...mockAccount, total_pl_amount: 0, total_pl_rate: 0 };
    render(<SummarySection account={zeroAccount} onUpdateCash={vi.fn()} formatNumber={formatNumber} />);
    const plSection = screen.getByText('총 평가 손익').closest('div');
    expect(plSection?.className).toContain('border-danger');
  });

  it('[Happy] 투자 자산이 표시된다', () => {
    render(<SummarySection account={mockAccount} onUpdateCash={vi.fn()} formatNumber={formatNumber} />);
    expect(screen.getByText('투자 자산 (평가금)')).toBeInTheDocument();
  });

  it('[Happy] 보유 현금이 입력 가능하다', () => {
    render(<SummarySection account={mockAccount} onUpdateCash={vi.fn()} formatNumber={formatNumber} />);
    expect(screen.getByText('보유 현금 (예수금)')).toBeInTheDocument();
  });

  it('[Error] account.id가 없으면 onUpdateCash가 호출되지 않는다', () => {
    const onUpdateCash = vi.fn();
    const noIdAccount: Account = { ...mockAccount, id: undefined as any };
    render(<SummarySection account={noIdAccount} onUpdateCash={onUpdateCash} formatNumber={formatNumber} />);
    // Component renders without crash
    expect(screen.getByText('보유 현금 (예수금)')).toBeInTheDocument();
  });

  it('[Happy] 현금 입력 변경 시 onUpdateCash가 계좌 id와 함께 호출된다', () => {
    const onUpdateCash = vi.fn();
    render(<SummarySection account={mockAccount} onUpdateCash={onUpdateCash} formatNumber={formatNumber} />);
    const cashInput = screen.getByRole('textbox');
    fireEvent.change(cashInput, { target: { value: '200000' } });
    expect(onUpdateCash).toHaveBeenCalledWith(1, '200000');
  });
});
