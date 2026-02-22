import type { VehicleClass } from "./damage-options";
import { LABOR_TABLE } from "./labor-estimates";
import {
  getAdjustedShopRate,
  getAdjustedPaintRate,
  getPartCostMultiplier,
  getRegionName,
} from "./labor-estimates-enhanced";

export interface DamageItem {
  damage_id: string;
  severity: "minor" | "moderate" | "severe";
}

export interface LineItem {
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
}

export interface EstimateResult {
  vehicle_class: VehicleClass;
  line_items: LineItem[];
  subtotal_labor_low: number;
  subtotal_labor_high: number;
  subtotal_parts_low: number;
  subtotal_parts_high: number;
  subtotal_paint_low: number;
  subtotal_paint_high: number;
  total_low: number;
  total_high: number;
  shop_rate_range: [number, number];
  item_count: number;
  region_name?: string;
  zip_code?: string;
}

const SEV_MULT: Record<string, number> = { minor: 0.6, moderate: 1.0, severe: 1.4 };

export function calculateEstimate(
  damages: DamageItem[],
  vehicleClass: VehicleClass,
  zipCode?: string
): EstimateResult {
  const shopRate = getAdjustedShopRate(vehicleClass, zipCode);
  const paintRate = getAdjustedPaintRate(vehicleClass, zipCode);
  const partMult = getPartCostMultiplier(zipCode);
  const lineItems: LineItem[] = [];

  for (const d of damages) {
    const entry = LABOR_TABLE[d.damage_id];
    if (!entry) continue;

    const mult = SEV_MULT[d.severity] ?? 1.0;
    const hours = entry.hours[vehicleClass];
    const parts = entry.part_cost[vehicleClass];

    const laborHoursLow = Math.round(hours[0] * mult * 10) / 10;
    const laborHoursHigh = Math.round(hours[1] * mult * 10) / 10;
    const laborCostLow = Math.round(laborHoursLow * shopRate[0]);
    const laborCostHigh = Math.round(laborHoursHigh * shopRate[1]);
    const partCostLow = Math.round(parts[0] * mult * partMult);
    const partCostHigh = Math.round(parts[1] * mult * partMult);
    const paintCostLow = Math.round(entry.paint_hours * paintRate[0] * mult);
    const paintCostHigh = Math.round(entry.paint_hours * paintRate[1] * mult);

    lineItems.push({
      part_name: entry.part_name,
      damage_id: d.damage_id,
      severity: d.severity,
      labor_hours_low: laborHoursLow,
      labor_hours_high: laborHoursHigh,
      labor_cost_low: laborCostLow,
      labor_cost_high: laborCostHigh,
      part_cost_low: partCostLow,
      part_cost_high: partCostHigh,
      paint_cost_low: paintCostLow,
      paint_cost_high: paintCostHigh,
      total_low: laborCostLow + partCostLow + paintCostLow,
      total_high: laborCostHigh + partCostHigh + paintCostHigh,
    });
  }

  const subtotalLaborLow = lineItems.reduce((s, i) => s + i.labor_cost_low, 0);
  const subtotalLaborHigh = lineItems.reduce((s, i) => s + i.labor_cost_high, 0);
  const subtotalPartsLow = lineItems.reduce((s, i) => s + i.part_cost_low, 0);
  const subtotalPartsHigh = lineItems.reduce((s, i) => s + i.part_cost_high, 0);
  const subtotalPaintLow = lineItems.reduce((s, i) => s + i.paint_cost_low, 0);
  const subtotalPaintHigh = lineItems.reduce((s, i) => s + i.paint_cost_high, 0);

  return {
    vehicle_class: vehicleClass,
    line_items: lineItems,
    subtotal_labor_low: subtotalLaborLow,
    subtotal_labor_high: subtotalLaborHigh,
    subtotal_parts_low: subtotalPartsLow,
    subtotal_parts_high: subtotalPartsHigh,
    subtotal_paint_low: subtotalPaintLow,
    subtotal_paint_high: subtotalPaintHigh,
    total_low: subtotalLaborLow + subtotalPartsLow + subtotalPaintLow,
    total_high: subtotalLaborHigh + subtotalPartsHigh + subtotalPaintHigh,
    shop_rate_range: shopRate,
    item_count: lineItems.length,
    region_name: zipCode ? getRegionName(zipCode) : undefined,
    zip_code: zipCode,
  };
}

export interface FlipResult {
  purchase_price: number;
  repair_cost_low: number;
  repair_cost_high: number;
  total_investment_low: number;
  total_investment_high: number;
  resale_value: number;
  profit_low: number;
  profit_high: number;
  margin_low: number;
  margin_high: number;
  roi_low: number;
  roi_high: number;
  verdict: "great_flip" | "decent_flip" | "break_even" | "money_pit";
  verdict_label: string;
  verdict_color: string;
}

export function calculateFlip(
  purchasePrice: number,
  repairLow: number,
  repairHigh: number,
  resaleValue: number
): FlipResult {
  const totalLow = purchasePrice + repairLow;
  const totalHigh = purchasePrice + repairHigh;
  const profitLow = resaleValue - totalHigh;
  const profitHigh = resaleValue - totalLow;
  const marginLow = resaleValue > 0 ? Math.round((profitLow / resaleValue) * 100) : 0;
  const marginHigh = resaleValue > 0 ? Math.round((profitHigh / resaleValue) * 100) : 0;
  const roiLow = totalHigh > 0 ? Math.round((profitLow / totalHigh) * 100) : 0;
  const roiHigh = totalLow > 0 ? Math.round((profitHigh / totalLow) * 100) : 0;

  let verdict: FlipResult["verdict"];
  let verdict_label: string;
  let verdict_color: string;

  if (profitLow >= 2000) {
    verdict = "great_flip"; verdict_label = "Great Flip 🔥"; verdict_color = "text-green-400";
  } else if (profitLow >= 500) {
    verdict = "decent_flip"; verdict_label = "Decent Flip 👍"; verdict_color = "text-yellow-400";
  } else if (profitLow >= -500) {
    verdict = "break_even"; verdict_label = "Break Even ⚠️"; verdict_color = "text-orange-400";
  } else {
    verdict = "money_pit"; verdict_label = "Money Pit 🚫"; verdict_color = "text-red-400";
  }

  return {
    purchase_price: purchasePrice,
    repair_cost_low: repairLow,
    repair_cost_high: repairHigh,
    total_investment_low: totalLow,
    total_investment_high: totalHigh,
    resale_value: resaleValue,
    profit_low: profitLow,
    profit_high: profitHigh,
    margin_low: marginLow,
    margin_high: marginHigh,
    roi_low: roiLow,
    roi_high: roiHigh,
    verdict,
    verdict_label,
    verdict_color,
  };
}
