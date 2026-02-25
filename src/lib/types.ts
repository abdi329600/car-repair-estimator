export interface AuctionData {
  source: "copart" | "iaa" | "manual";
  listing_url: string;
  lot_number?: string;
  vin: string;
  year: number;
  make: string;
  model: string;
  trim?: string;
  odometer: number;
  odometer_status?: string;
  primary_damage: string;
  secondary_damage?: string;
  photos: string[];
  current_bid: number;
  buy_now_price?: number;
  estimated_retail: number;
  title_type?: string;
  fuel_type?: string;
  engine?: string;
  transmission?: string;
  drive_type?: string;
  color?: string;
  keys_available?: boolean;
  runs_drives?: boolean;
  sale_date?: string;
  location?: string;
}

export interface PartResult {
  id: string;
  name: string;
  price: number;
  price_source: "live" | "estimated" | "none";
  confidence?: "high" | "medium" | "low";
  note?: string;
  vendor: "ebay" | "rockauto" | "partsgeek" | "google" | "generic";
  url: string;
  image_url?: string;
  shipping: number;
  availability: "in_stock" | "backorder" | "unknown";
  condition: "new" | "used" | "remanufactured";
  warranty?: string;
  affiliate_url?: string;
}

export interface ProLineItem {
  part_name: string;
  damage_id: string;
  severity: string;
  labor_hours_low: number;
  labor_hours_high: number;
  labor_cost_low: number;
  labor_cost_high: number;
  part_cost_low: number;
  part_cost_high: number;
  paint_cost_low: number;
  paint_cost_high: number;
  total_low: number;
  total_high: number;
  marketplace_parts: PartResult[];
  recommended_part?: PartResult;
  buy_now_url?: string;
}

export interface ProEstimate {
  vehicle_class: string;
  line_items: ProLineItem[];
  subtotal_labor_low: number;
  subtotal_labor_high: number;
  subtotal_parts_low: number;
  subtotal_parts_high: number;
  subtotal_parts_actual?: number;
  subtotal_paint_low: number;
  subtotal_paint_high: number;
  total_low: number;
  total_high: number;
  total_with_real_parts?: number;
  shop_rate_range: [number, number];
  item_count: number;
  profit_scenarios?: {
    best_case: number;
    realistic: number;
    worst_case: number;
  };
}

export type UserTier = "free" | "pro";

export interface UserProfile {
  id: string;
  email: string;
  tier: UserTier;
  estimates_this_month: number;
  created_at: string;
}

export interface SavedEstimate {
  id: string;
  user_id: string;
  auction_url?: string;
  vin?: string;
  vehicle_info: {
    year?: string;
    make?: string;
    model?: string;
    vehicle_class: string;
  };
  damage: { damage_id: string; severity: string }[];
  estimate: ProEstimate;
  purchase_price?: number;
  resale_value?: number;
  profit?: number;
  created_at: string;
}
