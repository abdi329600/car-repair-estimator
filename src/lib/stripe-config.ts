import Stripe from "stripe";

export const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2026-01-28.clover",
    })
  : null;

export const PLANS = {
  free: {
    name: "Free",
    price: 0,
    estimates_per_month: 3,
    features: [
      "Manual damage tagging",
      "Basic estimate ranges",
      "3 estimates/month",
      "Generic parts pricing",
    ],
  },
  pro: {
    name: "Pro",
    price: 29,
    price_id: process.env.STRIPE_PRO_PRICE_ID || "",
    estimates_per_month: Infinity,
    features: [
      "Auto-scrape Copart/IAA listings",
      "Live parts marketplace pricing",
      "Direct purchase links (eBay, RockAuto)",
      "Unlimited estimates",
      "Saved estimate portfolio",
      "Export estimates as PDF",
      "Profit tracking dashboard",
      "Priority support",
    ],
  },
} as const;

export function canUseFeature(tier: string, feature: string): boolean {
  const proFeatures = [
    "auction_scrape",
    "parts_marketplace",
    "save_estimate",
    "export_pdf",
    "profit_dashboard",
    "unlimited_estimates",
  ];
  if (tier === "pro") return true;
  return !proFeatures.includes(feature);
}
