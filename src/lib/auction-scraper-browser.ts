import type { AuctionData } from "./types";

const BROWSER_TIMEOUT = parseInt(process.env.AUCTION_BROWSER_TIMEOUT_MS || "30000");

/**
 * Playwright-based Copart scraper for development/testing.
 * Only used when ENABLE_BROWSER_SCRAPING=true.
 * Extracts vehicle data + photos from Copart lot pages by:
 *   1. Trying embedded JSON/script data (fastest)
 *   2. Falling back to DOM selectors
 */
export async function scrapeCopartWithBrowser(lotNumber: string): Promise<AuctionData | null> {
  let browser;
  try {
    // Dynamic import so Playwright isn't required in production
    const pw = await import("playwright-core");
    browser = await pw.chromium.launch({
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-blink-features=AutomationControlled",
      ],
    });

    const context = await browser.newContext({
      userAgent:
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      viewport: { width: 1920, height: 1080 },
      locale: "en-US",
      extraHTTPHeaders: {
        "Accept-Language": "en-US,en;q=0.9",
      },
    });

    const page = await context.newPage();

    const url = `https://www.copart.com/lot/${lotNumber}`;
    console.log(`[browser-scraper] Navigating to ${url}`);

    await page.goto(url, {
      waitUntil: "domcontentloaded",
      timeout: BROWSER_TIMEOUT,
    });

    // Wait a bit for JS to hydrate
    await page.waitForTimeout(3000);

    // ── Strategy 1: Extract from embedded JSON in page scripts ──
    const scriptData = await page.evaluate(() => {
      // Copart embeds lot data in script tags or window variables
      const scripts = Array.from(document.querySelectorAll("script"));
      for (const script of scripts) {
        const text = script.textContent || "";
        // Look for lot details JSON blob
        if (text.includes("lotDetails") || text.includes("lotdetails")) {
          try {
            // Try to find JSON object containing lot data
            const match = text.match(/lotDetails["\s:]*({[\s\S]*?})\s*[,;]/);
            if (match) return JSON.parse(match[1]);
          } catch { /* continue */ }
        }
        // Look for window.__NEXT_DATA__ or similar hydration payloads
        if (text.includes("__NEXT_DATA__") || text.includes("__INITIAL_STATE__")) {
          try {
            const match = text.match(/__(?:NEXT_DATA__|INITIAL_STATE__)\s*=\s*({[\s\S]*?});?\s*<\/script>/);
            if (match) {
              const payload = JSON.parse(match[1]);
              // Dig for lot data in the payload
              const props = payload?.props?.pageProps || payload;
              if (props?.lotDetails || props?.lot) return props.lotDetails || props.lot;
            }
          } catch { /* continue */ }
        }
      }
      return null;
    });

    if (scriptData) {
      console.log("[browser-scraper] Extracted data from embedded script");
      await browser.close();
      return buildAuctionDataFromRaw(scriptData, lotNumber);
    }

    // ── Strategy 2: DOM selector extraction ──
    console.log("[browser-scraper] Trying DOM selectors...");

    // Try waiting for a key element
    try {
      await page.waitForSelector(
        '[data-uname="lotdetailVinvalue"], .lot-detail-value, #lot-details',
        { timeout: 10000 }
      );
    } catch {
      console.log("[browser-scraper] Key selectors not found, trying generic extraction");
    }

    const domData = await page.evaluate(() => {
      const getText = (selectors: string[]): string => {
        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el?.textContent?.trim()) return el.textContent.trim();
        }
        return "";
      };

      const getImages = (): string[] => {
        const selectors = [
          ".lot-image img",
          ".image-gallery img",
          '[data-testid="lot-image"] img',
          ".imageGallery img",
          "img[src*='cs.copart.com']",
          "img[src*='copart']",
        ];
        const urls = new Set<string>();
        for (const sel of selectors) {
          document.querySelectorAll(sel).forEach((img) => {
            const src = (img as HTMLImageElement).src || img.getAttribute("data-src") || "";
            if (src && !src.includes("placeholder") && !src.includes("logo") && src.startsWith("http")) {
              urls.add(src);
            }
          });
        }
        return Array.from(urls);
      };

      return {
        vin: getText([
          '[data-uname="lotdetailVinvalue"]',
          '[data-testid="vin-value"]',
          ".lot-vin .lot-detail-value",
          'td:has(+ td:contains("VIN")) + td',
        ]),
        year: getText([
          '[data-uname="lotdetailYearvalue"]',
          ".lot-year .lot-detail-value",
        ]),
        make: getText([
          '[data-uname="lotdetailMakevalue"]',
          ".lot-make .lot-detail-value",
        ]),
        model: getText([
          '[data-uname="lotdetailModelvalue"]',
          ".lot-model .lot-detail-value",
        ]),
        primaryDamage: getText([
          '[data-uname="lotdetailPrimarydamagevalue"]',
          ".lot-primary-damage .lot-detail-value",
        ]),
        secondaryDamage: getText([
          '[data-uname="lotdetailSecondarydamagevalue"]',
          ".lot-secondary-damage .lot-detail-value",
        ]),
        odometer: getText([
          '[data-uname="lotdetailOdometervalue"]',
          ".lot-odometer .lot-detail-value",
        ]),
        estimatedRetail: getText([
          '[data-uname="lotdetailEstimatedretailvalue"]',
          ".lot-estimated-value .lot-detail-value",
        ]),
        currentBid: getText([
          '[data-uname="lotdetailCurrentbidvalue"]',
          ".lot-current-bid .lot-detail-value",
          '[data-testid="current-bid"]',
        ]),
        titleType: getText([
          '[data-uname="lotdetailTitlevalue"]',
          ".lot-title-type .lot-detail-value",
        ]),
        color: getText([
          '[data-uname="lotdetailColorvalue"]',
          ".lot-color .lot-detail-value",
        ]),
        engine: getText([
          '[data-uname="lotdetailEnginevalue"]',
          ".lot-engine .lot-detail-value",
        ]),
        transmission: getText([
          '[data-uname="lotdetailTransmissionvalue"]',
          ".lot-transmission .lot-detail-value",
        ]),
        fuelType: getText([
          '[data-uname="lotdetailFueltypevalue"]',
          ".lot-fuel-type .lot-detail-value",
        ]),
        driveType: getText([
          '[data-uname="lotdetailDrivetypevalue"]',
          ".lot-drive-type .lot-detail-value",
        ]),
        keys: getText([
          '[data-uname="lotdetailKeysvalue"]',
          ".lot-keys .lot-detail-value",
        ]),
        images: getImages(),
        // Also grab the page title as fallback for year/make/model
        pageTitle: document.title || "",
      };
    });

    await browser.close();

    // If we got at least a VIN or make, consider it a success
    if (domData.vin || domData.make || domData.model) {
      console.log("[browser-scraper] Extracted data from DOM selectors");
      return {
        source: "copart",
        listing_url: `https://www.copart.com/lot/${lotNumber}`,
        lot_number: lotNumber,
        vin: domData.vin,
        year: parseInt(domData.year) || parseYearFromTitle(domData.pageTitle),
        make: domData.make || parseMakeFromTitle(domData.pageTitle),
        model: domData.model || parseModelFromTitle(domData.pageTitle),
        odometer: parseInt(domData.odometer.replace(/[^0-9]/g, "")) || 0,
        primary_damage: domData.primaryDamage,
        secondary_damage: domData.secondaryDamage,
        photos: domData.images,
        current_bid: parseFloat(domData.currentBid.replace(/[^0-9.]/g, "")) || 0,
        estimated_retail: parseFloat(domData.estimatedRetail.replace(/[^0-9.]/g, "")) || 0,
        title_type: domData.titleType,
        fuel_type: domData.fuelType,
        engine: domData.engine,
        transmission: domData.transmission,
        drive_type: domData.driveType,
        color: domData.color,
        keys_available: domData.keys.toLowerCase().includes("yes"),
        runs_drives: false,
        location: "",
      };
    }

    // Try parsing page title as last resort: "2019 HONDA CIVIC - Lot #12345678"
    const titleData = parseCopartTitle(domData.pageTitle, lotNumber);
    if (titleData) {
      console.log("[browser-scraper] Extracted minimal data from page title");
      return titleData;
    }

    console.log("[browser-scraper] Could not extract any useful data");
    return null;
  } catch (e) {
    console.error("[browser-scraper] Playwright scrape failed:", e);
    return null;
  } finally {
    if (browser) {
      try { await browser.close(); } catch { /* already closed */ }
    }
  }
}

// ── Helpers ──

function buildAuctionDataFromRaw(lot: Record<string, unknown>, lotNumber: string): AuctionData {
  const str = (v: unknown) => (typeof v === "string" ? v : String(v || ""));
  const num = (v: unknown) => parseFloat(str(v).replace(/[^0-9.]/g, "")) || 0;

  return {
    source: "copart",
    listing_url: `https://www.copart.com/lot/${lotNumber}`,
    lot_number: lotNumber,
    vin: str(lot.fv || lot.vin || lot.VIN || ""),
    year: num(lot.lcy || lot.year || lot.Year),
    make: str(lot.mkn || lot.make || lot.Make || ""),
    model: str(lot.lm || lot.model || lot.Model || ""),
    trim: str(lot.ltm || lot.trim || lot.Trim || ""),
    odometer: num(lot.orr || lot.odometer || lot.Odometer),
    odometer_status: str(lot.ord || ""),
    primary_damage: str(lot.dd || lot.primaryDamage || lot.PrimaryDamage || ""),
    secondary_damage: str(lot.sdd || lot.secondaryDamage || lot.SecondaryDamage || ""),
    photos: [],
    current_bid: num(lot.hb || lot.highBid || lot.currentBid),
    buy_now_price: num(lot.bnp || lot.buyNowPrice) || undefined,
    estimated_retail: num(lot.la || lot.estimatedRetail || lot.estimatedValue),
    title_type: str(lot.tims || lot.titleType || ""),
    fuel_type: str(lot.ft || lot.fuelType || ""),
    engine: str(lot.egn || lot.engine || ""),
    transmission: str(lot.tmtp || lot.transmission || ""),
    drive_type: str(lot.drv || lot.driveType || ""),
    color: str(lot.clr || lot.color || ""),
    keys_available: str(lot.ky || lot.keys || "") === "YES",
    runs_drives: str(lot.rd || lot.runAndDrive || "") === "Run and Drive",
    sale_date: str(lot.ad || lot.saleDate || ""),
    location: str(lot.yn || lot.location || ""),
  };
}

function parseYearFromTitle(title: string): number {
  const match = title.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0]) : 0;
}

function parseMakeFromTitle(title: string): string {
  // "2019 HONDA CIVIC - Lot #..."
  const match = title.match(/\b(19|20)\d{2}\s+(\w+)/);
  return match ? match[2] : "";
}

function parseModelFromTitle(title: string): string {
  const match = title.match(/\b(19|20)\d{2}\s+\w+\s+(.+?)(?:\s*[-–—]|\s*$)/);
  return match ? match[2].trim() : "";
}

function parseCopartTitle(title: string, lotNumber: string): AuctionData | null {
  const year = parseYearFromTitle(title);
  const make = parseMakeFromTitle(title);
  const model = parseModelFromTitle(title);
  if (!year && !make) return null;
  return {
    source: "copart",
    listing_url: `https://www.copart.com/lot/${lotNumber}`,
    lot_number: lotNumber,
    vin: "",
    year,
    make,
    model,
    odometer: 0,
    primary_damage: "",
    photos: [],
    current_bid: 0,
    estimated_retail: 0,
    keys_available: false,
    runs_drives: false,
    location: "",
  };
}
