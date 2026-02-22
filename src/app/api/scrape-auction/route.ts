import { NextRequest, NextResponse } from "next/server";
import {
  detectAuctionSource,
  parseCopartUrl,
  parseIAAUrl,
  scrapeCopart,
  scrapeIAA,
  mapDamageToIds,
} from "@/lib/auction-scraper";

const BROWSER_SCRAPING_ENABLED = process.env.ENABLE_BROWSER_SCRAPING === "true";

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 });
    }

    const source = detectAuctionSource(url);
    if (!source) {
      return NextResponse.json(
        { error: "URL must be from Copart or IAA" },
        { status: 400 }
      );
    }

    let auctionData = null;
    let scrapeMethod = "none";

    if (source === "copart") {
      const { lotNumber, isValid } = parseCopartUrl(url);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid Copart URL" }, { status: 400 });
      }

      // Try 1: Fast API scrape
      auctionData = await scrapeCopart(lotNumber);
      if (auctionData) {
        scrapeMethod = "copart_api";
      }

      // Try 2: Browser scrape (dev-only, env-gated)
      if (!auctionData && BROWSER_SCRAPING_ENABLED) {
        console.log(`[scrape-auction] API failed for lot ${lotNumber}, trying browser scraper...`);
        try {
          const { scrapeCopartWithBrowser } = await import("@/lib/auction-scraper-browser");
          auctionData = await scrapeCopartWithBrowser(lotNumber);
          if (auctionData) scrapeMethod = "copart_browser";
        } catch (e) {
          console.error("[scrape-auction] Browser scraper failed:", e);
        }
      }
    } else if (source === "iaa") {
      const { stockNumber, isValid } = parseIAAUrl(url);
      if (!isValid) {
        return NextResponse.json({ error: "Invalid IAA URL" }, { status: 400 });
      }
      auctionData = await scrapeIAA(stockNumber);
      if (auctionData) scrapeMethod = "iaa_api";
    }

    if (!auctionData) {
      // All scraping methods failed — return enriched fallback
      const lotId = source === "copart"
        ? parseCopartUrl(url).lotNumber
        : parseIAAUrl(url).stockNumber;
      console.log(`[scrape-auction] All methods failed (method: ${scrapeMethod}) for ${source} ${lotId}`);
      return NextResponse.json({
        error: null,
        scraped: false,
        scrape_method: "manual_fallback",
        message: BROWSER_SCRAPING_ENABLED
          ? "Could not auto-import this listing. The site blocked all scraping attempts. Please enter vehicle details manually."
          : "Auto-import is not available. Set ENABLE_BROWSER_SCRAPING=true for dev mode. Enter vehicle details manually.",
        source,
        url,
        lot_number: lotId,
      });
    }

    // Auto-map damage descriptions to our damage IDs
    const suggestedDamages = mapDamageToIds(
      auctionData.primary_damage,
      auctionData.secondary_damage
    );

    // Auto-detect vehicle class from body type
    const bodyLower = (auctionData.model || "").toLowerCase();
    const makeLower = (auctionData.make || "").toLowerCase();
    let vehicleClass = "midsize";
    if (bodyLower.match(/truck|pickup|f-150|silverado|ram|tundra|tacoma|ranger|frontier|colorado/))
      vehicleClass = "truck";
    else if (bodyLower.match(/suv|explorer|tahoe|suburban|4runner|highlander|pilot|pathfinder|rav4|cr-v|escape|equinox/))
      vehicleClass = "suv";
    else if (makeLower.match(/bmw|mercedes|lexus|audi|porsche|jaguar|maserati|bentley|rolls|tesla/))
      vehicleClass = "luxury";
    else if (bodyLower.match(/civic|corolla|fit|yaris|versa|accent|rio|spark|sonic/))
      vehicleClass = "compact";
    else if (bodyLower.match(/impala|avalon|charger|300|maxima|taurus/))
      vehicleClass = "fullsize";

    return NextResponse.json({
      scraped: true,
      auction: auctionData,
      suggested_damages: suggestedDamages,
      suggested_vehicle_class: vehicleClass,
      source,
    });
  } catch {
    return NextResponse.json({ error: "Failed to process auction URL" }, { status: 500 });
  }
}
