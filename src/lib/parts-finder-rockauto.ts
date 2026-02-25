import type { PartResult } from "./types";

interface RockAutoApiPart {
  name: string;
  price: number;
  brand: string;
  part_number: string;
  availability: string;
  source: "rockauto";
  url?: string;
}

const ROCKAUTO_API_URL =
  process.env.ROCKAUTO_API_URL ||
  process.env.NEXT_PUBLIC_ROCKAUTO_API_URL ||
  "https://rock-auto-api.vercel.app";

const CATEGORY_MAP: Record<string, string> = {
  front_bumper_cracked: "body",
  hood_dented: "body",
  headlight_broken: "lighting",
  door_dented: "body",
  fender_damaged: "body",
  mirror_broken: "body",
  windshield_cracked: "glass",
  grille_damaged: "body",
  quarter_panel_dented: "body",
  rear_bumper_cracked: "body",
};

function normalizeAvailability(value: string): PartResult["availability"] {
  const lower = value.toLowerCase();
  if (lower.includes("stock")) return "in_stock";
  if (lower.includes("back")) return "backorder";
  return "unknown";
}

export async function searchRockAutoParts(
  damageId: string,
  partName: string,
  vehicleInfo: { year: string | number; make: string; model: string }
): Promise<PartResult[]> {
  const category = CATEGORY_MAP[damageId] || "body";
  const yearNum = Number(vehicleInfo.year);

  if (!Number.isFinite(yearNum)) return [];

  try {
    const response = await fetch(`${ROCKAUTO_API_URL}/parts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        make: vehicleInfo.make,
        year: yearNum,
        model: vehicleInfo.model,
        category,
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      console.error("[rockauto] API error:", response.status);
      return [];
    }

    const data = (await response.json()) as { parts?: RockAutoApiPart[] };
    const parts = data.parts || [];

    return parts.map((part, index): PartResult => ({
      id: `rockauto-api-${damageId}-${index}`,
      name: part.name || partName,
      price: Number(part.price) || 0,
      price_source: "live",
      vendor: "rockauto",
      url: part.url || ROCKAUTO_API_URL,
      shipping: 0,
      availability: normalizeAvailability(part.availability || "unknown"),
      condition: "new",
      warranty: part.brand ? `${part.brand} (${part.part_number})` : undefined,
    }));
  } catch (error) {
    console.error("[rockauto] Failed to fetch parts:", error);
    return [];
  }
}
