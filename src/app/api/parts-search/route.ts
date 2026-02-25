import { NextRequest, NextResponse } from "next/server";
import { findParts, findAllParts, getRockAutoBrowseResult } from "@/lib/parts-finder";

const PARTS_TIMEOUT_MS = 5000;

async function findAllPartsWithTimeout(
  parts: { damage_id: string; part_name: string }[],
  year: string | number,
  make: string,
  model: string
) {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("timeout")), PARTS_TIMEOUT_MS)
  );
  try {
    return await Promise.race([findAllParts(parts, year, make, model), timeout]);
  } catch (err) {
    if ((err as Error).message === "timeout") {
      // Graceful fallback: estimated RockAuto browse links only
      console.warn("[parts-search] eBay timeout — returning estimated fallback");
      return parts.map(p => ({
        part_name: p.part_name,
        damage_id: p.damage_id,
        results: [getRockAutoBrowseResult(p.part_name, year, make, model)],
        cheapest: getRockAutoBrowseResult(p.part_name, year, make, model),
        fastest: undefined,
        cached: false,
        ebay_median: undefined,
        ebay_confidence: undefined as ("high" | "medium" | "low" | undefined),
      }));
    }
    throw err;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { parts, year, make, model } = body as {
      parts: { damage_id: string; part_name: string }[];
      year: string | number;
      make: string;
      model: string;
    };

    if (!parts || !Array.isArray(parts) || parts.length === 0) {
      return NextResponse.json({ error: "Parts list required" }, { status: 400 });
    }
    if (!year || !make || !model) {
      return NextResponse.json({ error: "Vehicle year, make, model required" }, { status: 400 });
    }

    const results = await findAllPartsWithTimeout(parts, year, make, model);

    const totalCheapest = results.reduce((sum, r) => sum + (r.cheapest?.price || 0), 0);
    const partsWithLive = results.filter(r => r.ebay_median && r.ebay_median > 0).length;
    const partsWithPricing = results.filter(r => r.cheapest && r.cheapest.price > 0).length;

    return NextResponse.json({
      results,
      summary: {
        total_parts: results.length,
        parts_with_pricing: partsWithPricing,
        parts_with_live_price: partsWithLive,
        total_cheapest: Math.round(totalCheapest * 100) / 100,
        cached_count: results.filter(r => r.cached).length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Parts search failed" }, { status: 500 });
  }
}
