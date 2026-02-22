import { NextRequest, NextResponse } from "next/server";
import { calculateEstimate, calculateFlip } from "@/lib/estimator";
import type { DamageItem } from "@/lib/estimator";
import type { VehicleClass } from "@/lib/damage-options";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { damages, vehicle_class, purchase_price, resale_value, zip_code } = body as {
      damages: DamageItem[];
      vehicle_class: VehicleClass;
      purchase_price?: number;
      resale_value?: number;
      zip_code?: string;
    };

    if (!damages || !Array.isArray(damages) || damages.length === 0) {
      return NextResponse.json({ error: "At least one damage item required" }, { status: 400 });
    }
    if (!vehicle_class) {
      return NextResponse.json({ error: "Vehicle class required" }, { status: 400 });
    }

    const estimate = calculateEstimate(damages, vehicle_class, zip_code);

    let flip = null;
    if (purchase_price && resale_value) {
      flip = calculateFlip(purchase_price, estimate.total_low, estimate.total_high, resale_value);
    }

    return NextResponse.json({ estimate, flip });
  } catch {
    return NextResponse.json({ error: "Failed to calculate estimate" }, { status: 500 });
  }
}
