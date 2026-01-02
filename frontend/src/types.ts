export interface Asset {
  id: number;
  account_id: number;
  name: string;
  code?: string;
  category: string;
  target_weight: number;
  current_price: number;
  avg_price: number;
  quantity: number;
  
  // Computed
  current_value: number;
  invested_amount: number;
  pl_amount: number;
  pl_rate: number;
  current_weight: number;
  target_value: number;
  diff_value: number;
  action: "BUY" | "SELL" | "HOLD";
  action_quantity: number;
}

export interface Account {
  id: number;
  name: string;
  cash: number;
  assets: Asset[];
  
  // Computed Summary
  total_asset_value: number;
  total_invested_value: number;
  total_pl_amount: number;
  total_pl_rate: number;
}
