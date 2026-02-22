/**
 * Enhanced labor rate estimation with regional pricing based on ZIP code.
 *
 * Uses BLS.gov regional data (hardcoded — free, no API needed).
 * ZIP code first digit maps roughly to US Census regions.
 */

import type { VehicleClass } from "./damage-options";
import { SHOP_RATES, PAINT_RATE } from "./labor-estimates";

// ── Regional labor rate multipliers ──
// Base rates are in labor-estimates.ts (SHOP_RATES).
// These multipliers adjust for regional cost-of-living differences.
// Source: BLS Occupational Employment & Wage Statistics for auto body repair (SOC 49-3021)

interface RegionData {
  name: string;
  laborMultiplier: number;  // applied to shop rate
  paintMultiplier: number;  // applied to paint rate
  partMarkup: number;       // parts cost adjustment (1.0 = no change)
}

const REGIONS: Record<string, RegionData> = {
  northeast: {
    name: "Northeast (NY, NJ, CT, MA, PA, etc.)",
    laborMultiplier: 1.25,
    paintMultiplier: 1.20,
    partMarkup: 1.05,
  },
  southeast: {
    name: "Southeast (FL, GA, NC, SC, VA, etc.)",
    laborMultiplier: 0.90,
    paintMultiplier: 0.90,
    partMarkup: 0.95,
  },
  midwest: {
    name: "Midwest (OH, MI, IL, IN, WI, etc.)",
    laborMultiplier: 0.95,
    paintMultiplier: 0.95,
    partMarkup: 1.00,
  },
  southwest: {
    name: "Southwest (TX, AZ, NM, OK, etc.)",
    laborMultiplier: 1.00,
    paintMultiplier: 0.95,
    partMarkup: 0.98,
  },
  west: {
    name: "West Coast (CA, WA, OR, HI, etc.)",
    laborMultiplier: 1.35,
    paintMultiplier: 1.30,
    partMarkup: 1.08,
  },
  mountain: {
    name: "Mountain (CO, UT, NV, MT, ID, etc.)",
    laborMultiplier: 1.05,
    paintMultiplier: 1.00,
    partMarkup: 1.02,
  },
  default: {
    name: "National Average",
    laborMultiplier: 1.00,
    paintMultiplier: 1.00,
    partMarkup: 1.00,
  },
};

// ── ZIP code → region mapping ──
// US ZIP codes: first digit roughly maps to geographic regions
// 0 = Northeast (CT, MA, ME, NH, NJ, NY, PR, RI, VT, VI)
// 1 = Northeast (DE, NY, PA)
// 2 = Southeast (DC, MD, NC, SC, VA, WV)
// 3 = Southeast (AL, FL, GA, MS, TN)
// 4 = Midwest (IN, KY, MI, OH)
// 5 = Midwest (IA, MN, MT, ND, SD, WI)
// 6 = Midwest/Southwest (IL, KS, MO, NE)
// 7 = Southwest (AR, LA, OK, TX)
// 8 = Mountain/West (AZ, CO, ID, NM, NV, UT, WY)
// 9 = West (AK, CA, HI, OR, WA)

export function getRegionFromZip(zip: string): string {
  if (!zip || zip.length < 1) return "default";
  const first = parseInt(zip[0]);
  if (isNaN(first)) return "default";

  switch (first) {
    case 0:
    case 1: return "northeast";
    case 2:
    case 3: return "southeast";
    case 4:
    case 5: return "midwest";
    case 6: return "midwest";   // IL, KS, MO, NE — closer to midwest rates
    case 7: return "southwest";
    case 8: return "mountain";
    case 9: return "west";
    default: return "default";
  }
}

export function getRegionData(zipCode?: string): RegionData {
  const region = zipCode ? getRegionFromZip(zipCode) : "default";
  return REGIONS[region] || REGIONS.default;
}

export function getRegionName(zipCode?: string): string {
  return getRegionData(zipCode).name;
}

// ── Adjusted shop rates ──
// Returns [low, high] shop rate adjusted for region

export function getAdjustedShopRate(
  vehicleClass: VehicleClass,
  zipCode?: string
): [number, number] {
  const base = SHOP_RATES[vehicleClass];
  const { laborMultiplier } = getRegionData(zipCode);
  return [
    Math.round(base[0] * laborMultiplier),
    Math.round(base[1] * laborMultiplier),
  ];
}

export function getAdjustedPaintRate(
  vehicleClass: VehicleClass,
  zipCode?: string
): [number, number] {
  const base = PAINT_RATE[vehicleClass];
  const { paintMultiplier } = getRegionData(zipCode);
  return [
    Math.round(base[0] * paintMultiplier),
    Math.round(base[1] * paintMultiplier),
  ];
}

export function getPartCostMultiplier(zipCode?: string): number {
  return getRegionData(zipCode).partMarkup;
}
