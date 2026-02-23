import type { PartResult } from "./types";
import { searchRockAutoParts } from "./parts-finder-rockauto";

const EBAY_APP_ID = process.env.EBAY_APP_ID || "";
const EBAY_AFFILIATE_ID = process.env.EBAY_AFFILIATE_ID || "";
const EBAY_CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID || "";

// ─── eBay Finding API (free, affiliate revenue) ───

interface EbaySearchItem {
  itemId: string[];
  title: string[];
  galleryURL?: string[];
  viewItemURL: string[];
  sellingStatus: { currentPrice: { __value__: string }[] }[];
  shippingInfo?: { shippingServiceCost?: { __value__: string }[] }[];
  condition?: { conditionDisplayName: string[] }[];
  listingInfo?: { listingType: string[] }[];
}

export async function searchEbayParts(
  partName: string,
  year: string | number,
  make: string,
  model: string
): Promise<PartResult[]> {
  if (!EBAY_APP_ID) return [];

  const keywords = `${year} ${make} ${model} ${partName}`.trim();
  const categoryId = "6030"; // eBay Motors > Parts & Accessories

  try {
    const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
    url.searchParams.set("OPERATION-NAME", "findItemsByKeywords");
    url.searchParams.set("SERVICE-VERSION", "1.0.0");
    url.searchParams.set("SECURITY-APPNAME", EBAY_APP_ID);
    url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
    url.searchParams.set("REST-PAYLOAD", "true");
    url.searchParams.set("keywords", keywords);
    url.searchParams.set("categoryId", categoryId);
    url.searchParams.set("sortOrder", "PricePlusShippingLowest");
    url.searchParams.set("paginationInput.entriesPerPage", "8");
    // Affiliate tracking
    if (EBAY_AFFILIATE_ID) {
      url.searchParams.set("affiliate.networkId", "9");
      url.searchParams.set("affiliate.trackingId", EBAY_AFFILIATE_ID);
      url.searchParams.set("affiliate.customId", EBAY_CAMPAIGN_ID || "autoflip");
    }

    const res = await fetch(url.toString(), {
      headers: { "Accept": "application/json" },
      next: { revalidate: 3600 }, // cache 1 hour
    });

    if (!res.ok) return [];
    const data = await res.json();

    const items: EbaySearchItem[] =
      data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];

    return items.map((item): PartResult => {
      const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || "0");
      const shipping = parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || "0");
      const conditionRaw = item.condition?.[0]?.conditionDisplayName?.[0] || "New";
      const condition: PartResult["condition"] =
        conditionRaw.toLowerCase().includes("used") ? "used"
        : conditionRaw.toLowerCase().includes("reman") ? "remanufactured"
        : "new";

      const viewUrl = item.viewItemURL?.[0] || "";
      // Build affiliate URL
      const affiliateUrl = EBAY_CAMPAIGN_ID
        ? `https://rover.ebay.com/rover/1/${EBAY_AFFILIATE_ID}/1?mpre=${encodeURIComponent(viewUrl)}&campid=${EBAY_CAMPAIGN_ID}&toolid=10001`
        : viewUrl;

      return {
        id: item.itemId?.[0] || crypto.randomUUID(),
        name: item.title?.[0] || partName,
        price,
        vendor: "ebay",
        url: viewUrl,
        image_url: item.galleryURL?.[0] || undefined,
        shipping,
        availability: "in_stock",
        condition,
        affiliate_url: affiliateUrl,
      };
    });
  } catch (e) {
    console.error("eBay search failed:", e);
    return [];
  }
}

// ─── RockAuto (catalog URL construction — no API needed) ───

// Map damage/part names to RockAuto catalog category paths
const ROCKAUTO_CATEGORY_MAP: Record<string, { category: string; subcategory: string; label: string }> = {
  // Bumpers
  "front bumper": { category: "body+%26+lamp+assembly", subcategory: "bumper+cover", label: "Front Bumper Cover" },
  "rear bumper": { category: "body+%26+lamp+assembly", subcategory: "bumper+cover", label: "Rear Bumper Cover" },
  "bumper cover": { category: "body+%26+lamp+assembly", subcategory: "bumper+cover", label: "Bumper Cover" },
  "bumper reinforcement": { category: "body+%26+lamp+assembly", subcategory: "bumper+reinforcement", label: "Bumper Reinforcement" },
  // Lighting
  "headlight": { category: "body+%26+lamp+assembly", subcategory: "headlamp+assembly", label: "Headlamp Assembly" },
  "headlamp": { category: "body+%26+lamp+assembly", subcategory: "headlamp+assembly", label: "Headlamp Assembly" },
  "taillight": { category: "body+%26+lamp+assembly", subcategory: "tail+lamp+assembly", label: "Tail Lamp Assembly" },
  "tail light": { category: "body+%26+lamp+assembly", subcategory: "tail+lamp+assembly", label: "Tail Lamp Assembly" },
  "fog light": { category: "body+%26+lamp+assembly", subcategory: "fog+lamp", label: "Fog Lamp" },
  "turn signal": { category: "body+%26+lamp+assembly", subcategory: "parking+%26+turn+signal+light", label: "Turn Signal" },
  // Body panels
  "hood": { category: "body+%26+lamp+assembly", subcategory: "hood", label: "Hood" },
  "fender": { category: "body+%26+lamp+assembly", subcategory: "fender", label: "Fender" },
  "door": { category: "body+%26+lamp+assembly", subcategory: "door+shell", label: "Door Shell" },
  "trunk": { category: "body+%26+lamp+assembly", subcategory: "trunk+lid", label: "Trunk Lid" },
  "grille": { category: "body+%26+lamp+assembly", subcategory: "grille", label: "Grille" },
  // Glass
  "windshield": { category: "body+%26+lamp+assembly", subcategory: "windshield+glass", label: "Windshield Glass" },
  "window": { category: "body+%26+lamp+assembly", subcategory: "door+glass", label: "Door Glass" },
  // Mirrors
  "mirror": { category: "body+%26+lamp+assembly", subcategory: "mirror+-+side+view", label: "Side View Mirror" },
  // Cooling
  "radiator": { category: "cooling+system", subcategory: "radiator", label: "Radiator" },
  "condenser": { category: "a%2Fc+%26+heater", subcategory: "a%2Fc+condenser", label: "A/C Condenser" },
  // Suspension
  "strut": { category: "suspension", subcategory: "strut+%26+coil+spring+assembly", label: "Strut Assembly" },
  "shock": { category: "suspension", subcategory: "shock+absorber", label: "Shock Absorber" },
  "control arm": { category: "suspension", subcategory: "control+arm", label: "Control Arm" },
  "suspension": { category: "suspension", subcategory: "strut+%26+coil+spring+assembly", label: "Strut Assembly" },
  // Engine
  "engine": { category: "engine", subcategory: "engine+assembly", label: "Engine Assembly" },
  "alternator": { category: "engine+electrical", subcategory: "alternator+%2F+generator+%26+related+components", label: "Alternator" },
  "starter": { category: "engine+electrical", subcategory: "starter+motor", label: "Starter Motor" },
  // Brakes
  "brake pad": { category: "brake+%26+wheel+hub", subcategory: "disc+brake+pad", label: "Brake Pads" },
  "brake rotor": { category: "brake+%26+wheel+hub", subcategory: "disc+brake+rotor", label: "Brake Rotor" },
  // Interior
  "seat": { category: "interior", subcategory: "seat+cover", label: "Seat Cover" },
  "dashboard": { category: "interior", subcategory: "dash+board", label: "Dashboard" },
};

function matchRockAutoCategory(partName: string): { category: string; subcategory: string; label: string } | null {
  const lower = partName.toLowerCase();
  for (const [key, value] of Object.entries(ROCKAUTO_CATEGORY_MAP)) {
    if (lower.includes(key)) return value;
  }
  return null;
}

// Scrape actual prices from RockAuto HTML
async function scrapeRockAutoPrice(
  catalogUrl: string
): Promise<{ prices: number[]; brand?: string } | null> {
  try {
    const res = await fetch(catalogUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!res.ok) {
      console.warn(`[parts-scraper] RockAuto returned ${res.status}`);
      return null;
    }

    const html = await res.text();

    // RockAuto uses consistent price patterns in their HTML
    // Look for price spans: $XX.XX format
    const priceMatches = html.match(/\$(\d{1,4}\.\d{2})/g);
    if (!priceMatches || priceMatches.length === 0) return null;

    // Parse all prices, filter out obviously wrong ones (shipping, tax, etc.)
    const prices = priceMatches
      .map(p => parseFloat(p.replace("$", "")))
      .filter(p => p >= 5 && p <= 10000) // reasonable part price range
      .sort((a, b) => a - b);

    if (prices.length === 0) return null;

    // Try to extract a brand name near the first price
    const brandMatch = html.match(/class="listing-text-row-brand[^"]*"[^>]*>([^<]+)</);
    const brand = brandMatch?.[1]?.trim();

    console.log(`[parts-scraper] RockAuto found ${prices.length} prices, cheapest: $${prices[0]}`);
    return { prices, brand };
  } catch (e) {
    console.warn("[parts-scraper] RockAuto scrape failed:", e);
    return null;
  }
}

export async function searchRockAuto(
  damageId: string,
  partName: string,
  year: string | number,
  make: string,
  model: string
): Promise<PartResult[]> {
  const apiResults = await searchRockAutoParts(damageId, partName, { year, make, model });
  if (apiResults.length > 0) return apiResults;

  // RockAuto catalog URLs: /en/catalog/{make},{year},{model},{engine}/{category}/{subcategory}
  // We build the vehicle path and deep-link to the right category
  const makeFmt = make.toLowerCase().replace(/\s+/g, "+");
  const modelFmt = model.toLowerCase().replace(/\s+/g, "+");
  const vehiclePath = `${makeFmt},${year},${modelFmt}`;

  const matched = matchRockAutoCategory(partName);

  let catalogUrl: string;
  let displayName: string;

  if (matched) {
    catalogUrl = `https://www.rockauto.com/en/catalog/${vehiclePath},${matched.category},${matched.subcategory}`;
    displayName = `${matched.label} — RockAuto (${year} ${make} ${model})`;
  } else {
    catalogUrl = `https://www.rockauto.com/en/catalog/${vehiclePath}`;
    displayName = `${partName} — Browse RockAuto (${year} ${make} ${model})`;
  }

  const results: PartResult[] = [];

  // Try to scrape actual prices
  if (matched) {
    const scraped = await scrapeRockAutoPrice(catalogUrl);
    if (scraped && scraped.prices.length > 0) {
      // Add cheapest aftermarket option
      results.push({
        id: `rockauto-${partName.replace(/\s/g, "-").toLowerCase()}-cheap`,
        name: `${matched.label} (Aftermarket${scraped.brand ? ` — ${scraped.brand}` : ""})`,
        price: scraped.prices[0],
        vendor: "rockauto",
        url: catalogUrl,
        shipping: 0,
        availability: "in_stock",
        condition: "new",
      });

      // Add mid-range option if enough prices
      if (scraped.prices.length >= 3) {
        const midIdx = Math.floor(scraped.prices.length / 2);
        results.push({
          id: `rockauto-${partName.replace(/\s/g, "-").toLowerCase()}-mid`,
          name: `${matched.label} (Mid-Range)`,
          price: scraped.prices[midIdx],
          vendor: "rockauto",
          url: catalogUrl,
          shipping: 0,
          availability: "in_stock",
          condition: "new",
        });
      }
    }
  }

  // Always add a browse link (even if scraping succeeded, user may want to see all options)
  results.push({
    id: `rockauto-${partName.replace(/\s/g, "-").toLowerCase()}`,
    name: displayName,
    price: 0,
    vendor: "rockauto",
    url: catalogUrl,
    shipping: 0,
    availability: "in_stock",
    condition: "new",
  });

  // Google Shopping as backup
  const googleUrl = `https://www.google.com/search?tbm=shop&q=${encodeURIComponent(`${year} ${make} ${model} ${partName}`)}`;
  results.push({
    id: `google-${partName.replace(/\s/g, "-").toLowerCase()}`,
    name: `${partName} — Google Shopping`,
    price: 0,
    vendor: "google",
    url: googleUrl,
    shipping: 0,
    availability: "unknown",
    condition: "new",
  });

  return results;
}

// ─── Multi-source search with caching ───

export interface PartsSearchResult {
  part_name: string;
  damage_id: string;
  results: PartResult[];
  cheapest?: PartResult;
  fastest?: PartResult;
  cached: boolean;
}

// In-memory cache (in production, use Supabase parts_cache table)
const partsCache = new Map<string, { results: PartResult[]; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 hours

export async function findParts(
  partName: string,
  year: string | number,
  make: string,
  model: string,
  damageId: string
): Promise<PartsSearchResult> {
  const cacheKey = `${year}-${make}-${model}-${partName}`.toLowerCase();
  const cached = partsCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    const sorted = [...cached.results].sort((a, b) => (a.price || 999999) - (b.price || 999999));
    return {
      part_name: partName,
      damage_id: damageId,
      results: cached.results,
      cheapest: sorted.find(r => r.price > 0),
      fastest: sorted.find(r => r.availability === "in_stock" && r.price > 0),
      cached: true,
    };
  }

  // Search all sources in parallel
  const [ebayResults, rockAutoResults] = await Promise.allSettled([
    searchEbayParts(partName, year, make, model),
    searchRockAuto(damageId, partName, year, make, model),
  ]);

  const allResults: PartResult[] = [
    ...(ebayResults.status === "fulfilled" ? ebayResults.value : []),
    ...(rockAutoResults.status === "fulfilled" ? rockAutoResults.value : []),
  ];

  // Cache results
  partsCache.set(cacheKey, { results: allResults, timestamp: Date.now() });

  const pricedResults = allResults.filter(r => r.price > 0);
  const sorted = [...pricedResults].sort((a, b) => a.price - b.price);

  return {
    part_name: partName,
    damage_id: damageId,
    results: allResults,
    cheapest: sorted[0],
    fastest: sorted.find(r => r.availability === "in_stock"),
    cached: false,
  };
}

// ─── Batch search for all damage items ───

export async function findAllParts(
  damages: { damage_id: string; part_name: string }[],
  year: string | number,
  make: string,
  model: string
): Promise<PartsSearchResult[]> {
  // Run searches in parallel, max 3 concurrent to avoid rate limits
  const results: PartsSearchResult[] = [];
  const batchSize = 3;

  for (let i = 0; i < damages.length; i += batchSize) {
    const batch = damages.slice(i, i + batchSize);
    const batchResults = await Promise.allSettled(
      batch.map(d => findParts(d.part_name, year, make, model, d.damage_id))
    );
    for (const r of batchResults) {
      if (r.status === "fulfilled") results.push(r.value);
    }
  }

  return results;
}
