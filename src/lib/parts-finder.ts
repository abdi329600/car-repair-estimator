import type { PartResult } from "./types";

const EBAY_APP_ID = process.env.EBAY_APP_ID || "";
const EBAY_AFFILIATE_ID = process.env.EBAY_AFFILIATE_ID || "";
const EBAY_CAMPAIGN_ID = process.env.EBAY_CAMPAIGN_ID || "";

// ─── Junk title filter ───────────────────────────────────────────────────────

const JUNK_KEYWORDS = [
  "for parts", "for repair", "broken", "damaged", "cracked",
  "read desc", "as is", "shell only", "empty", "no bulb",
  "core only", "incomplete", "for rebuild", "non-working",
];

function isJunkListing(title: string): boolean {
  const lower = title.toLowerCase();
  return JUNK_KEYWORDS.some(kw => lower.includes(kw));
}

function computeMedian(prices: number[]): number {
  if (prices.length === 0) return 0;
  const sorted = [...prices].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

// ─── Estimated price table (fallback when eBay unavailable) ─────────────────

const ESTIMATED_PRICES: Record<string, number> = {
  "front bumper": 185, "rear bumper": 160, "bumper cover": 175,
  "bumper reinforcement": 120, "headlight": 145, "headlamp": 145,
  "taillight": 120, "tail light": 120, "fog light": 65,
  "turn signal": 55, "hood": 380, "fender": 220, "door": 340,
  "trunk": 260, "grille": 95, "windshield": 310, "window": 185,
  "mirror": 115, "radiator": 275, "condenser": 195,
  "strut": 165, "shock": 120, "control arm": 145,
  "engine": 1800, "alternator": 195, "starter": 145,
  "brake pad": 55, "brake rotor": 85, "seat": 210, "dashboard": 480,
};

function getEstimatedPartPrice(partName: string): number {
  const lower = partName.toLowerCase();
  for (const [key, val] of Object.entries(ESTIMATED_PRICES)) {
    if (lower.includes(key)) return val;
  }
  return 150;
}

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

// ─── eBay median price engine ────────────────────────────────────────────────

export async function getEbayMedianPrice(
  partName: string,
  year: string | number,
  make: string,
  model: string
): Promise<{ price: number; confidence: PartResult["confidence"]; listings: PartResult[] }> {
  if (!EBAY_APP_ID) return { price: 0, confidence: "low", listings: [] };

  const keywords = `${year} ${make} ${model} ${partName}`.trim();
  try {
    const url = new URL("https://svcs.ebay.com/services/search/FindingService/v1");
    url.searchParams.set("OPERATION-NAME", "findItemsByKeywords");
    url.searchParams.set("SERVICE-VERSION", "1.0.0");
    url.searchParams.set("SECURITY-APPNAME", EBAY_APP_ID);
    url.searchParams.set("RESPONSE-DATA-FORMAT", "JSON");
    url.searchParams.set("REST-PAYLOAD", "true");
    url.searchParams.set("keywords", keywords);
    url.searchParams.set("categoryId", "6030");
    url.searchParams.set("sortOrder", "PricePlusShippingLowest");
    url.searchParams.set("paginationInput.entriesPerPage", "20");
    if (EBAY_AFFILIATE_ID) {
      url.searchParams.set("affiliate.networkId", "9");
      url.searchParams.set("affiliate.trackingId", EBAY_AFFILIATE_ID);
      url.searchParams.set("affiliate.customId", EBAY_CAMPAIGN_ID || "autoflip");
    }

    const res = await fetch(url.toString(), { headers: { "Accept": "application/json" } });
    if (!res.ok) return { price: 0, confidence: "low", listings: [] };
    const data = await res.json();
    const items: EbaySearchItem[] =
      data?.findItemsByKeywordsResponse?.[0]?.searchResult?.[0]?.item || [];

    const goodListings: PartResult[] = [];
    const goodPrices: number[] = [];

    for (const item of items) {
      const title = item.title?.[0] || "";
      if (isJunkListing(title)) continue;
      const price = parseFloat(item.sellingStatus?.[0]?.currentPrice?.[0]?.__value__ || "0");
      const shipping = parseFloat(item.shippingInfo?.[0]?.shippingServiceCost?.[0]?.__value__ || "0");
      const total = price + shipping;
      if (total <= 0) continue;
      const conditionRaw = item.condition?.[0]?.conditionDisplayName?.[0] || "New";
      const condition: PartResult["condition"] =
        conditionRaw.toLowerCase().includes("used") ? "used"
        : conditionRaw.toLowerCase().includes("reman") ? "remanufactured"
        : "new";
      const viewUrl = item.viewItemURL?.[0] || "";
      const affiliateUrl = EBAY_CAMPAIGN_ID
        ? `https://rover.ebay.com/rover/1/${EBAY_AFFILIATE_ID}/1?mpre=${encodeURIComponent(viewUrl)}&campid=${EBAY_CAMPAIGN_ID}&toolid=10001`
        : viewUrl;
      goodPrices.push(total);
      goodListings.push({
        id: item.itemId?.[0] || crypto.randomUUID(),
        name: title,
        price: total,
        price_source: "live",
        vendor: "ebay",
        url: viewUrl,
        image_url: item.galleryURL?.[0] || undefined,
        shipping,
        availability: "in_stock",
        condition,
        affiliate_url: affiliateUrl,
      });
    }

    const medianPrice = computeMedian(goodPrices);
    const confidence: PartResult["confidence"] =
      goodPrices.length >= 6 ? "high" : goodPrices.length >= 3 ? "medium" : "low";
    return { price: medianPrice, confidence, listings: goodListings };
  } catch (e) {
    console.error("[ebay-median] failed:", e);
    return { price: 0, confidence: "low", listings: [] };
  }
}

export async function searchEbayParts(
  partName: string,
  year: string | number,
  make: string,
  model: string
): Promise<PartResult[]> {
  const { listings } = await getEbayMedianPrice(partName, year, make, model);
  return listings;
}

// ─── RockAuto (browse link + table estimate — no scraping) ───

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

export function getRockAutoBrowseResult(
  partName: string,
  year: string | number,
  make: string,
  model: string
): PartResult {
  const makeFmt = make.toLowerCase().replace(/\s+/g, "+");
  const modelFmt = model.toLowerCase().replace(/\s+/g, "+");
  const vehiclePath = `${makeFmt},${year},${modelFmt}`;
  const matched = matchRockAutoCategory(partName);
  const catalogUrl = matched
    ? `https://www.rockauto.com/en/catalog/${vehiclePath},${matched.category},${matched.subcategory}`
    : `https://www.rockauto.com/en/catalog/${vehiclePath}`;
  const label = matched?.label || partName;
  return {
    id: `rockauto-${partName.replace(/\s/g, "-").toLowerCase()}`,
    name: `${label} — RockAuto (${year} ${make} ${model})`,
    price: getEstimatedPartPrice(partName),
    price_source: "estimated",
    confidence: "medium",
    note: "Est. price — click to browse exact pricing on RockAuto",
    vendor: "rockauto",
    url: catalogUrl,
    shipping: 0,
    availability: "in_stock",
    condition: "new",
  };
}

// ─── Multi-source search with in-memory cache + in-flight dedup ──────────────

export interface PartsSearchResult {
  part_name: string;
  damage_id: string;
  results: PartResult[];
  cheapest?: PartResult;
  fastest?: PartResult;
  cached: boolean;
  ebay_median?: number;
  ebay_confidence?: PartResult["confidence"];
}

const LIVE_TTL = 12 * 60 * 60 * 1000; // 12h — eBay live data
const EST_TTL  =  7 * 24 * 60 * 60 * 1000; // 7d  — estimated-only data

const partsCache = new Map<string, { result: PartsSearchResult; expiresAt: number }>();
const inFlight   = new Map<string, Promise<PartsSearchResult>>();

function priceKey(year: string | number, make: string, model: string, partName: string): string {
  return `parts:${year}:${make}:${model}:${partName}`.toLowerCase().replace(/\s+/g, "_");
}

async function _fetchParts(
  partName: string,
  year: string | number,
  make: string,
  model: string,
  damageId: string
): Promise<PartsSearchResult> {
  const { price: medianPrice, confidence, listings: ebayListings } =
    await getEbayMedianPrice(partName, year, make, model);

  const rockauto = getRockAutoBrowseResult(partName, year, make, model);

  const allResults: PartResult[] = [];

  // eBay median summary card (if we got a valid median)
  if (medianPrice > 0) {
    allResults.push({
      id: `ebay-median-${damageId}`,
      name: `${partName} — eBay Market Price`,
      price: Math.round(medianPrice * 100) / 100,
      price_source: "live",
      confidence,
      note: `Median of ${ebayListings.length} listings after filtering junk`,
      vendor: "ebay",
      url: `https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(`${year} ${make} ${model} ${partName}`)}&_sacat=6030`,
      shipping: 0,
      availability: "in_stock",
      condition: "new",
    });
  }

  // RockAuto estimated browse link
  allResults.push(rockauto);

  // Top individual eBay listings (up to 5)
  allResults.push(...ebayListings.map(r => ({ ...r, confidence })).slice(0, 5));

  const pricedLive = allResults.filter(r => r.price > 0 && r.price_source === "live");
  const pricedEst  = allResults.filter(r => r.price > 0 && r.price_source === "estimated");
  const sorted = [...pricedLive, ...pricedEst].sort((a, b) => a.price - b.price);

  const result: PartsSearchResult = {
    part_name: partName,
    damage_id: damageId,
    results: allResults,
    cheapest: sorted[0],
    fastest: sorted.find(r => r.availability === "in_stock"),
    cached: false,
    ebay_median: medianPrice > 0 ? Math.round(medianPrice * 100) / 100 : undefined,
    ebay_confidence: medianPrice > 0 ? confidence : undefined,
  };

  const ttl = medianPrice > 0 ? LIVE_TTL : EST_TTL;
  partsCache.set(priceKey(year, make, model, partName), {
    result,
    expiresAt: Date.now() + ttl,
  });

  return result;
}

export async function findParts(
  partName: string,
  year: string | number,
  make: string,
  model: string,
  damageId: string
): Promise<PartsSearchResult> {
  const key = priceKey(year, make, model, partName);

  // Serve from cache if fresh
  const cached = partsCache.get(key);
  if (cached && Date.now() < cached.expiresAt) {
    return { ...cached.result, cached: true };
  }
  partsCache.delete(key);

  // Deduplicate concurrent requests for the same part
  if (inFlight.has(key)) {
    return inFlight.get(key)!;
  }

  const promise = _fetchParts(partName, year, make, model, damageId)
    .finally(() => inFlight.delete(key));
  inFlight.set(key, promise);
  return promise;
}

// ─── Batch search for all damage items ───────────────────────────────────────

export async function findAllParts(
  damages: { damage_id: string; part_name: string }[],
  year: string | number,
  make: string,
  model: string
): Promise<PartsSearchResult[]> {
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
