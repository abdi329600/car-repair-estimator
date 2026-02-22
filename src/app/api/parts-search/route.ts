import { NextRequest, NextResponse } from "next/server";
import { findParts, findAllParts } from "@/lib/parts-finder";

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

    const results = await findAllParts(parts, year, make, model);

    const totalCheapest = results.reduce((sum, r) => sum + (r.cheapest?.price || 0), 0);
    const partsWithPricing = results.filter(r => r.cheapest && r.cheapest.price > 0).length;

    return NextResponse.json({
      results,
      summary: {
        total_parts: results.length,
        parts_with_pricing: partsWithPricing,
        total_cheapest: Math.round(totalCheapest * 100) / 100,
        cached_count: results.filter(r => r.cached).length,
      },
    });
  } catch {
    return NextResponse.json({ error: "Parts search failed" }, { status: 500 });
  }
}
