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

// Portfolio presets (Plan B). Mirrors the backend Preset* response DTOs.
export interface PresetItem {
  // Optional: PresetItem is a child of the Preset aggregate and the backend
  // does not surface its own id (returns null). Present for forward-compat.
  id?: number;
  name: string;
  code: string | null;
  category: string;  // "주식" | "채권" | "원자재" | "현금" | "기타"
  target_weight: number;
}

export interface Preset {
  id: number;
  name: string;
  created_at: string;
  items: PresetItem[];
}

// Response from POST /presets/{id}/apply/{account_id}.
export interface ApplyPresetResult {
  account: Account;       // recomputed (calculated) account
  updated_count: number;
  created_count: number;
  weight_sum: number;
}
