import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Home from '../../src/app/page';
import React from 'react';

const mockUsePortfolioData = vi.fn();

vi.mock('../../src/lib/hooks/usePortfolioData', () => ({
  usePortfolioData: () => mockUsePortfolioData(),
}));

const baseReturn = {
  accounts: [],
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
};

const mockAccount = {
  id: 1,
  name: 'Mock Account',
  assets: [],
  cash: 0,
  total_asset_value: 0,
  total_invested_value: 0,
  total_pl_amount: 0,
  total_pl_rate: 0,
};

describe('Home Page Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUsePortfolioData.mockReturnValue({ ...baseReturn, accounts: [mockAccount] });
  });

  it('[Happy] 계좌 목록이 정상 렌더링된다', () => {
    render(<Home />);
    expect(screen.getAllByText('Mock Account').length).toBeGreaterThan(0);
  });

  it('[Happy] isGuest=true 일 때 게스트 화면이 렌더링된다', () => {
    mockUsePortfolioData.mockReturnValue({ ...baseReturn, isGuest: true });
    render(<Home />);
    expect(screen.getByText('시작하기')).toBeInTheDocument();
  });
});
