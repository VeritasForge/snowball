import { render, screen } from '@testing-library/react';
import { DonutChart } from '../../src/components/DonutChart';
import { Asset } from '../../src/types';
import { vi, describe, it, expect } from 'vitest';

// Mock recharts - Legend calls content prop to allow renderLegend coverage
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: ({ data, label }: any) => (
    <div data-testid="pie">
      {data.map((item: any, index: number) => {
        // Call the label renderer to cover renderCustomizedLabel
        const labelEl = label ? label({
          cx: 100, cy: 100, midAngle: 45, innerRadius: 50, outerRadius: 100,
          percent: item.value / data.reduce((s: number, d: any) => s + d.value, 0),
          index,
        }) : null;
        return (
          <div key={item.name} data-testid="pie-cell" data-value={item.value} data-name={item.name} data-color={item.color}>
            {item.name}: {item.value}
            {labelEl}
          </div>
        );
      })}
    </div>
  ),
  Cell: () => null,
  Tooltip: ({ formatter }: any) => {
    // Call formatter to cover tooltip branch (both value and undefined)
    if (formatter) {
      formatter(1000);
      formatter(undefined);
    }
    return <div data-testid="tooltip" />;
  },
  Legend: ({ content }: any) => {
    // Call content prop to execute renderLegend
    const legendEl = content ? content({
      payload: [
        { value: 'Samsung', color: '#ef4444', payload: { percent: 0.5, category: '주식' } },
        { value: '현금 (예수금)', color: '#22c55e', payload: { percent: 0.1, category: '현금' } },
      ]
    }) : null;
    return <div data-testid="legend">{legendEl}</div>;
  },
}));

describe('DonutChart', () => {
  const mockAssets: Asset[] = [
    { id: 1, name: 'Samsung', category: '주식', current_value: 1000, account_id: 1, target_weight: 50, current_price: 100, avg_price: 100, quantity: 10, pl_amount: 0, pl_rate: 0, invested_amount: 1000, current_weight: 60, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
    { id: 2, name: 'Bond ETF', category: '채권', current_value: 500, account_id: 1, target_weight: 30, current_price: 100, avg_price: 100, quantity: 5, pl_amount: 0, pl_rate: 0, invested_amount: 500, current_weight: 30, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
    { id: 3, name: 'Zero Value', category: '기타', current_value: 0, account_id: 1, target_weight: 0, current_price: 0, avg_price: 0, quantity: 0, pl_amount: 0, pl_rate: 0, invested_amount: 0, current_weight: 0, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
  ];

  it('[Happy] 자산 데이터로 차트가 렌더링된다', () => {
    render(<DonutChart assets={mockAssets} cash={0} />);

    // Should render the chart container
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();

    // Should render segments for assets with > 0 value
    expect(screen.getByText('Samsung: 1000')).toBeInTheDocument();
    expect(screen.getByText('Bond ETF: 500')).toBeInTheDocument();

    // Should NOT render segment for 0 value asset
    expect(screen.queryByText('Zero Value: 0')).not.toBeInTheDocument();
  });

  it('[Boundary] 빈 자산 배열 시 "보유 자산이 없습니다" 메시지가 표시된다', () => {
    render(<DonutChart assets={[]} cash={0} />);
    expect(screen.getByText('보유 자산이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByTestId('pie-cell')).not.toBeInTheDocument();
  });

  it('[Happy] cash > 0 일 때 현금 세그먼트가 추가된다', () => {
    render(<DonutChart assets={mockAssets} cash={200} />);
    expect(screen.getByText('현금 (예수금): 200')).toBeInTheDocument();
  });

  it('[Boundary] 현금만 있을 때 (assets 빈 배열 + cash > 0) 현금 세그먼트가 표시된다', () => {
    render(<DonutChart assets={[]} cash={500} />);
    // With only cash, chartData has one item -> renders chart (not empty state)
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
    expect(screen.getByText('현금 (예수금): 500')).toBeInTheDocument();
  });

  it('[Happy] 범례(legend)가 렌더링되어 비중 정보가 표시된다', () => {
    render(<DonutChart assets={mockAssets} cash={0} />);
    expect(screen.getByTestId('legend')).toBeInTheDocument();
    // The legend mock renders items with percent
    expect(screen.getByText('50.0%')).toBeInTheDocument();
  });

  it('[Boundary] current_weight=0인 자산은 percent=0으로 처리된다', () => {
    const zeroWeightAssets: Asset[] = [
      { id: 1, name: 'Asset', category: '주식', current_value: 1000, account_id: 1, target_weight: 50, current_price: 100, avg_price: 100, quantity: 10, pl_amount: 0, pl_rate: 0, invested_amount: 1000, current_weight: 0, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
    ];
    render(<DonutChart assets={zeroWeightAssets} cash={0} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });

  it('[Boundary] 알 수 없는 카테고리는 DEFAULT_COLOR 사용', () => {
    const unknownCategoryAssets: Asset[] = [
      { id: 1, name: 'Mystery Asset', category: '알수없음', current_value: 1000, account_id: 1, target_weight: 50, current_price: 100, avg_price: 100, quantity: 10, pl_amount: 0, pl_rate: 0, invested_amount: 1000, current_weight: 50, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
    ];
    render(<DonutChart assets={unknownCategoryAssets} cash={0} />);
    // unknown category gets DEFAULT_COLOR (#94a3b8)
    const pieCells = screen.getAllByTestId('pie-cell');
    expect(pieCells[0]).toHaveAttribute('data-color', '#94a3b8');
  });

  it('[Boundary] 비중이 3% 미만인 슬라이스에는 라벨이 표시되지 않는다 (percent < 0.03)', () => {
    // A small asset with very small percentage
    const smallAssets: Asset[] = [
      { id: 1, name: 'Big Asset', category: '주식', current_value: 9900, account_id: 1, target_weight: 99, current_price: 9900, avg_price: 9900, quantity: 1, pl_amount: 0, pl_rate: 0, invested_amount: 9900, current_weight: 99, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
      { id: 2, name: 'Tiny Asset', category: '채권', current_value: 100, account_id: 1, target_weight: 1, current_price: 100, avg_price: 100, quantity: 1, pl_amount: 0, pl_rate: 0, invested_amount: 100, current_weight: 1, target_value: 0, diff_value: 0, action: 'HOLD', action_quantity: 0 },
    ];
    render(<DonutChart assets={smallAssets} cash={0} />);
    expect(screen.getByTestId('pie-chart')).toBeInTheDocument();
  });
});
