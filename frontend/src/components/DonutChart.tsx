import React, { useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';
import { Asset } from '../types';
import { Activity, Wallet } from 'lucide-react';

interface DonutChartProps {
  assets: Asset[];
  cash: number;
}

const CATEGORY_COLORS: Record<string, string> = {
  '주식': '#ef4444', 
  '채권': '#3b82f6', 
  '원자재': '#eab308', 
  '현금': '#22c55e', 
  '기타': '#94a3b8', 
};

const DEFAULT_COLOR = '#94a3b8';
const RADIAN = Math.PI / 180;

const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  // Only show label if the slice is large enough to contain text
  if (percent < 0.03) return null;

  return (
    <text 
      x={x} 
      y={y} 
      fill="white" 
      textAnchor="middle" 
      dominantBaseline="central"
      className="text-[11px] font-black pointer-events-none drop-shadow-sm"
    >
      {`${(percent * 100).toFixed(1)}%`}
    </text>
  );
};

export const DonutChart: React.FC<DonutChartProps> = ({ assets, cash }) => {
  const chartData = useMemo(() => {
    // Total Net Worth for manual cash percent calculation
    const totalAssets = assets.reduce((sum, a) => sum + a.current_value, 0);
    const totalNetWorth = totalAssets + cash;

    const data = assets
      .filter(asset => asset.current_value > 0)
      .map(asset => ({
        name: asset.name,
        value: asset.current_value,
        // Use current_weight from asset to match table exactly
        // Recharts Pie internally uses 'value' for slice size, 
        // we use 'percent' for the label text.
        percent: (asset.current_weight || 0) / 100, 
        category: asset.category,
        color: CATEGORY_COLORS[asset.category] || DEFAULT_COLOR
      }));

    if (cash > 0) {
      data.push({
        name: '현금 (예수금)',
        value: cash,
        percent: totalNetWorth > 0 ? (cash / totalNetWorth) : 0,
        category: '현금',
        color: CATEGORY_COLORS['현금']
      });
    }
    
    // Sort by value desc for a cleaner look
    const sorted = data.sort((a, b) => b.value - a.value);
    
    // Ensure '현금' always stays at the bottom
    const cashIndex = sorted.findIndex(d => d.category === '현금');
    if (cashIndex > -1) {
      const [cashItem] = sorted.splice(cashIndex, 1);
      sorted.push(cashItem);
    }
    
    return sorted;
  }, [
    assets.map(a => `${a.id}-${a.quantity}-${a.name}-${a.category}`).join('|'),
    cash
  ]);

  if (chartData.length === 0) {
    return (
      <div className="bg-card rounded-xl shadow-sm p-4 h-[400px] flex items-center justify-center border border-border">
        <p className="text-muted text-sm">보유 자산이 없습니다.</p>
      </div>
    );
  }

  const renderLegend = (props: any) => {
    const { payload } = props;
    return (
      <ul className="grid grid-cols-1 gap-2 ml-2 max-h-[350px] overflow-y-auto pr-2 custom-scrollbar">
        {payload.map((entry: any, index: number) => {
            const dataItem = entry.payload; 
            const Icon = dataItem.category === '현금' ? Wallet : Activity;
            
            return (
              <li key={`item-${index}`} className="flex items-center gap-2 text-xs text-muted-foreground w-full">
                 <span 
                    className="w-5 h-5 min-w-5 rounded-full flex items-center justify-center text-white text-[10px]"
                    style={{ backgroundColor: entry.color }}
                 >
                    <Icon size={12} />
                 </span>
                 <span className="font-medium text-foreground truncate max-w-[100px]" title={entry.value}>{entry.value}</span>
                 <span className="ml-auto font-bold">{(dataItem.percent * 100).toFixed(1)}%</span>
              </li>
            );
        })}
      </ul>
    );
  };

  return (
    <div className="bg-card rounded-xl shadow-sm p-4 border border-border">
      <h3 className="text-muted text-sm font-medium mb-4">자산 구성</h3>
      <div className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartData}
              cx="40%"
              cy="50%"
              innerRadius={50} // Increased thickness (100 - 50 = 50px)
              outerRadius={100} // Slightly larger diameter
              paddingAngle={2}
              dataKey="value"
              label={renderCustomizedLabel}
              labelLine={false}
              isAnimationActive={false} // Disable animation to stop flickering
            >
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} strokeWidth={0} />
              ))}
            </Pie>
            <Tooltip 
                formatter={(value: number) => Math.round(value).toLocaleString() + '원'}
                contentStyle={{ backgroundColor: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', borderRadius: '0.5rem' }}
                itemStyle={{ color: 'hsl(var(--foreground))' }}
            />
            <Legend 
                layout="vertical" 
                verticalAlign="middle" 
                align="right"
                content={renderLegend}
                wrapperStyle={{ width: '45%' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
