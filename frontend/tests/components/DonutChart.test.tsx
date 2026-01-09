import { render, screen } from '@testing-library/react';
import { DonutChart } from '../../src/components/DonutChart';
import { Asset } from '../../src/types';
import React from 'react';
import { vi, describe, it, expect } from 'vitest';

// Mock recharts
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data }: any) => (
    <div data-testid="pie">
      {data.map((item: any) => (
        <div key={item.name} data-testid="pie-cell" data-value={item.value} data-name={item.name} data-color={item.color}>
            {item.name}: {item.value}
        </div>
      ))}
    </div>
  ),
  Cell: () => null,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
}));

describe('DonutChart', () => {
  const mockAssets: Asset[] = [
    { id: 1, name: 'Samsung', category: '주식', current_value: 1000, account_id: 1, target_weight: 0, current_price: 100, avg_price: 100, quantity: 10, pl_amount: 0, pl_rate: 0, invested_amount: 1000, current_weight: 0, target_value: 0, diff_value: 0, action: '', action_quantity: 0 },
    { id: 2, name: 'Bond ETF', category: '채권', current_value: 500, account_id: 1, target_weight: 0, current_price: 100, avg_price: 100, quantity: 5, pl_amount: 0, pl_rate: 0, invested_amount: 500, current_weight: 0, target_value: 0, diff_value: 0, action: '', action_quantity: 0 },
    { id: 3, name: 'Zero Value', category: '기타', current_value: 0, account_id: 1, target_weight: 0, current_price: 0, avg_price: 0, quantity: 0, pl_amount: 0, pl_rate: 0, invested_amount: 0, current_weight: 0, target_value: 0, diff_value: 0, action: '', action_quantity: 0 },
  ];

  it('renders chart with correct data segments', () => {
    render(<DonutChart assets={mockAssets} />);
    
    // Should render the chart container
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    
    // Should render segments for assets with > 0 value
    expect(screen.getByText('Samsung: 1000')).toBeInTheDocument();
    expect(screen.getByText('Bond ETF: 500')).toBeInTheDocument();
    
    // Should NOT render segment for 0 value asset
    expect(screen.queryByText('Zero Value: 0')).not.toBeInTheDocument();
  });

  it('renders placeholder or empty state when no assets', () => {
     render(<DonutChart assets={[]} />);
     // Assuming implementation handles empty state gracefully, maybe just empty chart or specific message
     // For now, let's verify it doesn't crash
     expect(screen.queryByTestId('pie-cell')).not.toBeInTheDocument();
  });
});
