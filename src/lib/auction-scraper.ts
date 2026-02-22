import type { AuctionData } from "./types";

// Damage mapping: Copart/IAA damage descriptions → our damage_ids
const DAMAGE_MAP: Record<string, string[]> = {
  "front end": ["front_bumper_cracked", "hood_dented", "headlight_l_broken", "grille_broken"],
  "rear end": ["rear_bumper_cracked", "trunk_dented", "taillight_l_broken"],
  "side": ["fender_l_dented", "door_fl_dented"],
  "left front": ["fender_l_dented", "headlight_l_broken", "door_fl_dented"],
  "right front": ["fender_r_dented", "headlight_r_broken", "door_fr_dented"],
  "left side": ["fender_l_dented", "door_fl_dented", "door_rl_dented", "mirror_l_broken"],
  "right side": ["fender_r_dented", "door_fr_dented", "door_rr_dented", "mirror_r_broken"],
  "left rear": ["door_rl_dented", "taillight_l_broken", "fender_l_dented"],
  "right rear": ["door_rr_dented", "taillight_r_broken", "fender_r_dented"],
  "top/roof": ["roof_dented"],
  "rollover": ["roof_crushed", "windshield_shattered", "door_fl_dented", "door_fr_dented"],
  "undercarriage": ["frame_subframe", "suspension_front"],
  "all over": ["front_bumper_cracked", "rear_bumper_cracked", "hood_dented", "fender_l_dented", "fender_r_dented", "roof_dented"],
  "minor dent": ["front_bumper_scratched"],
  "normal wear": [],
  "hail damage": ["hood_dented", "roof_dented", "trunk_dented"],
  "flood": ["interior_water", "engine_no_start"],
  "water/flood": ["interior_water", "engine_no_start"],
  "fire": ["interior_dash", "engine_no_start", "hood_bent"],
  "vandalism": ["windshield_cracked", "door_fl_window", "interior_dash"],
  "theft": ["interior_dash", "door_fl_stuck"],
  "mechanical": ["engine_no_start"],
  "engine": ["engine_no_start", "engine_overheat"],
  "transmission": ["engine_trans"],
  "suspension": ["suspension_front", "suspension_rear"],
  "frame damage": ["frame_bent"],
  "biohazard": ["interior_seats", "interior_water"],
  "windshield": ["windshield_cracked"],
};

export function mapDamageToIds(primaryDamage: string, secondaryDamage?: string): { damage_id: string; severity: "minor" | "moderate" | "severe" }[] {
  const results: Map<string, "minor" | "moderate" | "severe"> = new Map();
  const primary = primaryDamage.toLowerCase().trim();
  const secondary = secondaryDamage?.toLowerCase().trim();

  // Map primary damage (moderate-severe)
  for (const [key, ids] of Object.entries(DAMAGE_MAP)) {
    if (primary.includes(key)) {
      ids.forEach(id => results.set(id, "moderate"));
    }
  }

  // Map secondary damage (minor-moderate)
  if (secondary) {
    for (const [key, ids] of Object.entries(DAMAGE_MAP)) {
      if (secondary.includes(key)) {
        ids.forEach(id => {
          if (!results.has(id)) results.set(id, "minor");
        });
      }
    }
  }

  // If no matches, add generic front end damage
  if (results.size === 0) {
    results.set("front_bumper_cracked", "moderate");
  }

  return Array.from(results.entries()).map(([damage_id, severity]) => ({ damage_id, severity }));
}

export function parseCopartUrl(url: string): { lotNumber: string; isValid: boolean } {
  // Copart URLs: copart.com/lot/12345678 or copart.com/lot/12345678/...
  const match = url.match(/copart\.com\/lot\/(\d+)/i);
  if (match) return { lotNumber: match[1], isValid: true };

  // Also handle: copart.com/lotDetail/12345678
  const match2 = url.match(/copart\.com\/lotDetail\/(\d+)/i);
  if (match2) return { lotNumber: match2[1], isValid: true };

  return { lotNumber: "", isValid: false };
}

export function parseIAAUrl(url: string): { stockNumber: string; isValid: boolean } {
  // IAA URLs: iaai.com/VehicleDetail/12345678
  const match = url.match(/iaai\.com\/VehicleDetail\/(\d+)/i);
  if (match) return { stockNumber: match[1], isValid: true };

  // Also: iaai.com/vehicledetail?stockNumber=12345678
  const match2 = url.match(/stockNumber[=\/](\d+)/i);
  if (match2) return { stockNumber: match2[1], isValid: true };

  return { stockNumber: "", isValid: false };
}

export function detectAuctionSource(url: string): "copart" | "iaa" | null {
  if (url.includes("copart.com")) return "copart";
  if (url.includes("iaai.com")) return "iaa";
  return null;
}

// Common headers to mimic a real browser session
const BROWSER_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Referer": "https://www.copart.com/",
  "Origin": "https://www.copart.com",
};

// Scrape Copart listing using their semi-public solr API
// Copart's frontend fetches lot data from this endpoint
export async function scrapeCopart(lotNumber: string): Promise<AuctionData | null> {
  // Try multiple endpoints — Copart rotates/changes these
  const endpoints = [
    `https://www.copart.com/public/data/lotdetails/solr/${lotNumber}`,
    `https://www.copart.com/public/data/lotdetails/solr/${lotNumber}/USA`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: BROWSER_HEADERS,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const text = await res.text();

      // Copart sometimes returns HTML (Cloudflare challenge) instead of JSON
      if (text.startsWith("<") || text.includes("<!DOCTYPE")) continue;

      const data = JSON.parse(text);
      const lot = data?.data?.lotDetails;
      if (!lot) continue;

      // Fetch images separately
      let images: string[] = [];
      try {
        const imgRes = await fetch(
          `https://www.copart.com/public/data/lotdetails/solr/lotImages/${lotNumber}/USA`,
          { headers: BROWSER_HEADERS, signal: AbortSignal.timeout(5000) }
        );
        if (imgRes.ok) {
          const imgText = await imgRes.text();
          if (!imgText.startsWith("<")) {
            const imgData = JSON.parse(imgText);
            images = (imgData?.data?.imagesList?.FULL_IMAGE || [])
              .map((img: { url?: string }) => img.url)
              .filter(Boolean) as string[];
          }
        }
      } catch { /* images are optional */ }

      return {
        source: "copart",
        listing_url: `https://www.copart.com/lot/${lotNumber}`,
        lot_number: lotNumber,
        vin: lot.fv || lot.vin || "",
        year: parseInt(lot.lcy || lot.year) || 0,
        make: lot.mkn || lot.make || "",
        model: lot.lm || lot.model || "",
        trim: lot.ltm || lot.trim || "",
        odometer: parseInt(lot.orr || lot.odometer) || 0,
        odometer_status: lot.ord || "",
        primary_damage: lot.dd || lot.primaryDamage || "",
        secondary_damage: lot.sdd || lot.secondaryDamage || "",
        photos: images,
        current_bid: parseFloat(lot.hb || lot.highBid) || 0,
        buy_now_price: parseFloat(lot.bnp || lot.buyNowPrice) || undefined,
        estimated_retail: parseFloat(lot.la || lot.estimatedRetail) || 0,
        title_type: lot.tims || lot.titleType || "",
        fuel_type: lot.ft || lot.fuelType || "",
        engine: lot.egn || lot.engine || "",
        transmission: lot.tmtp || lot.transmission || "",
        drive_type: lot.drv || lot.driveType || "",
        color: lot.clr || lot.color || "",
        keys_available: (lot.ky || lot.keys) === "YES",
        runs_drives: (lot.rd || lot.runAndDrive) === "Run and Drive",
        sale_date: lot.ad || lot.saleDate || "",
        location: lot.yn || lot.location || "",
      };
    } catch (e) {
      console.error(`Copart endpoint ${endpoint} failed:`, e);
      continue;
    }
  }

  console.error("All Copart endpoints failed for lot:", lotNumber);
  return null;
}

// Scrape IAA listing using their search/detail API
export async function scrapeIAA(stockNumber: string): Promise<AuctionData | null> {
  const iaaHeaders = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/plain, */*",
    "Accept-Language": "en-US,en;q=0.9",
    "Referer": "https://www.iaai.com/",
    "Origin": "https://www.iaai.com",
  };

  // Try IAA's API endpoints
  const endpoints = [
    `https://www.iaai.com/Vehicle/VehicleDetails?stockNumber=${stockNumber}`,
    `https://www.iaai.com/Vehicles/VehicleDetails/${stockNumber}`,
  ];

  for (const endpoint of endpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: iaaHeaders,
        signal: AbortSignal.timeout(10000),
      });

      if (!res.ok) continue;
      const text = await res.text();

      // IAA may return HTML instead of JSON
      if (text.startsWith("<") || text.includes("<!DOCTYPE")) {
        // Try to extract JSON-LD or embedded data from HTML
        const jsonLdMatch = text.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
        if (jsonLdMatch) {
          try {
            const ld = JSON.parse(jsonLdMatch[1]);
            if (ld.name || ld.vin) {
              // Parse from JSON-LD schema
              const nameParts = (ld.name || "").split(" ");
              return {
                source: "iaa",
                listing_url: `https://www.iaai.com/VehicleDetail/${stockNumber}`,
                lot_number: stockNumber,
                vin: ld.vehicleIdentificationNumber || ld.vin || "",
                year: parseInt(nameParts[0]) || 0,
                make: nameParts[1] || "",
                model: nameParts.slice(2).join(" ") || "",
                odometer: parseInt(ld.mileageFromOdometer?.value) || 0,
                primary_damage: ld.description || "",
                photos: ld.image ? (Array.isArray(ld.image) ? ld.image : [ld.image]) : [],
                current_bid: 0,
                estimated_retail: 0,
                color: ld.color || "",
                keys_available: false,
                runs_drives: false,
                location: "",
              };
            }
          } catch { /* JSON-LD parse failed */ }
        }
        continue;
      }

      const data = JSON.parse(text);

      return {
        source: "iaa",
        listing_url: `https://www.iaai.com/VehicleDetail/${stockNumber}`,
        lot_number: stockNumber,
        vin: data.VIN || data.vin || "",
        year: parseInt(data.Year || data.year) || 0,
        make: data.Make || data.make || "",
        model: data.Model || data.model || "",
        odometer: parseInt(data.Odometer || data.odometer) || 0,
        primary_damage: data.PrimaryDamage || data.primaryDamage || data.DamageDescription || "",
        secondary_damage: data.SecondaryDamage || data.secondaryDamage || "",
        photos: (data.ImageUrls || data.imageUrls || data.Images || []) as string[],
        current_bid: parseFloat(data.CurrentBid || data.currentBid) || 0,
        estimated_retail: parseFloat(data.EstimatedRetailValue || data.estimatedRetail) || 0,
        title_type: data.TitleState || data.titleState || "",
        fuel_type: data.FuelType || data.fuelType || "",
        engine: data.Engine || data.engine || "",
        transmission: data.Transmission || data.transmission || "",
        color: data.Color || data.color || "",
        keys_available: (data.Keys || data.keys) === "Yes",
        runs_drives: (data.RunAndDrive || data.runAndDrive) === "Yes",
        location: data.Branch || data.branch || data.Location || "",
      };
    } catch (e) {
      console.error(`IAA endpoint ${endpoint} failed:`, e);
      continue;
    }
  }

  console.error("All IAA endpoints failed for stock:", stockNumber);
  return null;
}

// Fallback: Build auction data from VIN decode + manual input
export function buildManualAuctionData(
  vinData: { year: string; make: string; model: string; trim?: string; body_class?: string; engine?: string },
  url?: string
): Partial<AuctionData> {
  return {
    source: "manual",
    listing_url: url || "",
    vin: "",
    year: parseInt(vinData.year) || 0,
    make: vinData.make,
    model: vinData.model,
    trim: vinData.trim,
    photos: [],
    current_bid: 0,
    estimated_retail: 0,
    primary_damage: "",
    odometer: 0,
  };
}
