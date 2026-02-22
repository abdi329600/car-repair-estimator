/**
 * Stock photo fetcher for comparison-based damage analysis.
 *
 * Lookup chain:
 *   1. Wikipedia API (free, no key, reliable CDN URLs for car model pages)
 *   2. Google Custom Search API (free 100/day, needs API key)
 *   3. Return null → caller falls back to single-image analysis
 *
 * Caching:
 *   - Supabase `stock_photos` table if configured (persists across cold starts)
 *   - In-memory Map fallback otherwise
 */

import sharp from "sharp";

// ── In-memory cache (fallback when Supabase isn't configured) ──
const memoryCache = new Map<string, string | null>();

function cacheKey(year: number, make: string, model: string): string {
  return `${year}_${make.toLowerCase().trim()}_${model.toLowerCase().trim().replace(/\s+/g, "_")}`;
}

// ── Wikipedia page title mappings for top flip cars ──
// Maps "make_model" to Wikipedia article titles (stable, never break)
// The API resolves these to real image URLs at runtime.

const WIKIPEDIA_PAGES: Record<string, string[]> = {
  // Honda
  "honda_accord": ["Honda_Accord", "Honda_Accord_(tenth_generation)"],
  "honda_civic": ["Honda_Civic", "Honda_Civic_(eleventh_generation)"],
  "honda_cr-v": ["Honda_CR-V"],

  // Toyota
  "toyota_camry": ["Toyota_Camry", "Toyota_Camry_(XV70)"],
  "toyota_corolla": ["Toyota_Corolla", "Toyota_Corolla_(E210)"],
  "toyota_rav4": ["Toyota_RAV4"],

  // BMW
  "bmw_5_series": ["BMW_5_Series", "BMW_5_Series_(G30)"],
  "bmw_3_series": ["BMW_3_Series", "BMW_3_Series_(G20)"],
  "bmw_x3": ["BMW_X3"],

  // Ford
  "ford_f-150": ["Ford_F-Series", "Ford_F-Series_(fourteenth_generation)"],
  "ford_explorer": ["Ford_Explorer"],
  "ford_escape": ["Ford_Escape"],

  // Chevrolet
  "chevrolet_silverado": ["Chevrolet_Silverado"],
  "chevrolet_equinox": ["Chevrolet_Equinox"],

  // Nissan
  "nissan_altima": ["Nissan_Altima"],
  "nissan_rogue": ["Nissan_Rogue"],

  // Hyundai / Kia
  "hyundai_elantra": ["Hyundai_Elantra"],
  "kia_optima": ["Kia_Optima", "Kia_K5"],
  "kia_k5": ["Kia_K5", "Kia_Optima"],

  // Tesla
  "tesla_model_3": ["Tesla_Model_3"],
  "tesla_model_y": ["Tesla_Model_Y"],

  // Mercedes
  "mercedes-benz_c-class": ["Mercedes-Benz_C-Class"],
  "mercedes-benz_e-class": ["Mercedes-Benz_E-Class"],
};

// ── Supabase helpers (optional — works without it) ──

async function getSupabase() {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;
    const { createClient } = await import("@supabase/supabase-js");
    return createClient(url, key);
  } catch {
    return null;
  }
}

async function getCachedFromSupabase(
  year: number, make: string, model: string
): Promise<string | null> {
  const sb = await getSupabase();
  if (!sb) return null;
  try {
    const { data } = await sb
      .from("stock_photos")
      .select("photo_url")
      .eq("year", year)
      .eq("make", make.toLowerCase())
      .eq("model", model.toLowerCase())
      .single();
    return data?.photo_url || null;
  } catch {
    return null;
  }
}

async function cacheToSupabase(
  year: number, make: string, model: string, photoUrl: string, source: string
): Promise<void> {
  const sb = await getSupabase();
  if (!sb) return;
  try {
    await sb.from("stock_photos").upsert({
      year,
      make: make.toLowerCase(),
      model: model.toLowerCase(),
      photo_url: photoUrl,
      source,
    }, { onConflict: "year,make,model" });
  } catch (e) {
    console.warn("[stock-photos] Supabase cache write failed:", e);
  }
}

// ── Google Custom Search API ──

async function fetchViaGoogleCSE(
  year: number, make: string, model: string
): Promise<string | null> {
  const apiKey = process.env.GOOGLE_CSE_API_KEY;
  const cseId = process.env.GOOGLE_CSE_ID;
  if (!apiKey || !cseId) return null;

  try {
    const query = `${year} ${make} ${model} exterior stock photo new car`;
    const url = `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=${cseId}&q=${encodeURIComponent(query)}&searchType=image&num=3&imgSize=large&imgType=photo&safe=active`;

    console.log(`[stock-photos] Google CSE search: "${query}"`);
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      console.warn("[stock-photos] Google CSE error:", res.status);
      return null;
    }

    const data = await res.json();
    const items = data.items as Array<{ link: string; mime: string }> | undefined;
    if (!items || items.length === 0) return null;

    // Pick the first JPEG/PNG result
    const img = items.find(i => /image\/(jpeg|png|webp)/.test(i.mime || "image/jpeg")) || items[0];
    console.log("[stock-photos] Google CSE found:", img.link.slice(0, 80));
    return img.link;
  } catch (e) {
    console.warn("[stock-photos] Google CSE failed:", e);
    return null;
  }
}

// ── Fetch image URL → base64 (enhanced with sharp) ──

async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(15000),
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; CarRepairEstimator/1.0)",
      },
    });
    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());

    // Enhance with sharp — same pipeline as damaged photos
    const enhanced = await sharp(buffer)
      .resize(1920, 1080, { fit: "inside", withoutEnlargement: false })
      .sharpen({ sigma: 1.0 })
      .normalize()
      .jpeg({ quality: 90 })
      .toBuffer();

    console.log(`[stock-photos] Fetched & enhanced: ${(enhanced.length / 1024).toFixed(0)}KB`);
    return enhanced.toString("base64");
  } catch (e) {
    console.warn("[stock-photos] Image fetch failed:", e);
    return null;
  }
}

// ── Wikipedia API — free, no key, reliable ──

function normalizeModel(model: string): string {
  return model
    .toLowerCase()
    .replace(/[-\s]+/g, "_")
    .replace(/[^a-z0-9_]/g, "");
}

function findWikipediaPages(make: string, model: string): string[] {
  const makeLower = make.toLowerCase().trim();
  const modelNorm = normalizeModel(model);
  const key = `${makeLower}_${modelNorm}`;

  // Check exact match in our mapping
  if (WIKIPEDIA_PAGES[key]) return WIKIPEDIA_PAGES[key];

  // Partial match (e.g. "528i" → "5_series", "Silverado 1500" → "silverado")
  for (const [mapKey, pages] of Object.entries(WIKIPEDIA_PAGES)) {
    if (mapKey.startsWith(`${makeLower}_`)) {
      const mapModel = mapKey.slice(makeLower.length + 1);
      if (modelNorm.includes(mapModel) || mapModel.includes(modelNorm)) {
        return pages;
      }
    }
  }

  // Fallback: construct a Wikipedia title from make + model
  const titleGuess = `${make.trim()}_${model.trim()}`.replace(/\s+/g, "_");
  return [titleGuess];
}

async function fetchViaWikipedia(make: string, model: string): Promise<string | null> {
  const pages = findWikipediaPages(make, model);

  for (const pageTitle of pages) {
    try {
      const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(pageTitle)}&prop=pageimages&piprop=original&format=json`;
      console.log(`[stock-photos] Wikipedia API: ${pageTitle}`);

      const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(8000),
        headers: { "User-Agent": "CarRepairEstimator/1.0 (damage-comparison-tool)" },
      });
      if (!res.ok) continue;

      const data = await res.json();
      const pages_data = data?.query?.pages;
      if (!pages_data) continue;

      for (const page of Object.values(pages_data) as Array<{ original?: { source: string } }>) {
        const imgUrl = page?.original?.source;
        if (imgUrl && /\.(jpg|jpeg|png|webp)/i.test(imgUrl)) {
          console.log("[stock-photos] Wikipedia found:", imgUrl.slice(0, 100));
          return imgUrl;
        }
      }
    } catch (e) {
      console.warn(`[stock-photos] Wikipedia API failed for ${pageTitle}:`, e);
    }
  }

  return null;
}

// ── Main export ──

export interface StockPhotoResult {
  base64: string;
  source: "wikipedia" | "google_cse" | "supabase_cache";
  url: string;
}

export async function getStockPhoto(
  year: number, make: string, model: string
): Promise<StockPhotoResult | null> {
  const key = cacheKey(year, make, model);

  // 0. Check in-memory cache
  if (memoryCache.has(key)) {
    const cached = memoryCache.get(key);
    if (cached === null) return null; // Previously failed — don't retry
  }

  console.log(`[stock-photos] Looking up: ${year} ${make} ${model}`);

  // 1. Check Supabase cache
  const supabaseUrl = await getCachedFromSupabase(year, make, model);
  if (supabaseUrl) {
    console.log("[stock-photos] Supabase cache hit");
    const base64 = await fetchImageAsBase64(supabaseUrl);
    if (base64) {
      memoryCache.set(key, base64);
      return { base64, source: "supabase_cache", url: supabaseUrl };
    }
  }

  // 2. Try Wikipedia API (free, no key needed)
  const wikiUrl = await fetchViaWikipedia(make, model);
  if (wikiUrl) {
    const base64 = await fetchImageAsBase64(wikiUrl);
    if (base64) {
      memoryCache.set(key, base64);
      await cacheToSupabase(year, make, model, wikiUrl, "wikipedia");
      return { base64, source: "wikipedia", url: wikiUrl };
    }
  }

  // 3. Try Google CSE (needs API key)
  const cseUrl = await fetchViaGoogleCSE(year, make, model);
  if (cseUrl) {
    const base64 = await fetchImageAsBase64(cseUrl);
    if (base64) {
      memoryCache.set(key, base64);
      await cacheToSupabase(year, make, model, cseUrl, "google_cse");
      return { base64, source: "google_cse", url: cseUrl };
    }
  }

  // 4. Nothing found
  console.log("[stock-photos] No stock photo found for", year, make, model);
  memoryCache.set(key, null);
  return null;
}
