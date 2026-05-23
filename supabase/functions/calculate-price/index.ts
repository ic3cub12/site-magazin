import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface PriceRequest {
  title: string;
  description: string;
  category: string;
  subcategory?: string;
  condition: string;
  attributes?: Record<string, string>;
}

interface PriceResponse {
  suggested_price: number;
  price_min: number;
  price_max: number;
  reasoning: string;
  market_sources: string[];
  confidence: "high" | "medium" | "low";
}

const CATEGORY_BASE_PRICES: Record<string, Record<string, { min: number; max: number }>> = {
  cars: {
    default: { min: 2000, max: 80000 },
    autoturism: { min: 3000, max: 60000 },
    suv: { min: 8000, max: 120000 },
    camion: { min: 10000, max: 200000 },
    motocicleta: { min: 800, max: 30000 },
  },
  real_estate: {
    default: { min: 20000, max: 500000 },
    apartament: { min: 30000, max: 300000 },
    casa: { min: 50000, max: 800000 },
    teren: { min: 5000, max: 500000 },
    spatiu_comercial: { min: 20000, max: 1000000 },
  },
  electronics: {
    default: { min: 50, max: 3000 },
    telefon: { min: 100, max: 2500 },
    laptop: { min: 200, max: 5000 },
    tableta: { min: 100, max: 2000 },
    televizor: { min: 150, max: 5000 },
    consola: { min: 100, max: 800 },
  },
  appliances: {
    default: { min: 100, max: 3000 },
    masina_spalat: { min: 200, max: 2000 },
    frigider: { min: 200, max: 3000 },
    aragaz: { min: 150, max: 2500 },
    masina_spalat_vase: { min: 200, max: 2000 },
    aer_conditionat: { min: 300, max: 3000 },
  },
  furniture: {
    default: { min: 50, max: 5000 },
    canapea: { min: 200, max: 3000 },
    pat: { min: 200, max: 3000 },
    masa: { min: 100, max: 2000 },
    dulap: { min: 150, max: 2500 },
  },
  clothing: { default: { min: 5, max: 500 } },
  sports: {
    default: { min: 20, max: 5000 },
    bicicleta: { min: 100, max: 8000 },
    echipament_fitness: { min: 50, max: 5000 },
  },
  other: { default: { min: 10, max: 5000 } },
};

const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  like_new: 0.85,
  good: 0.65,
  fair: 0.45,
  poor: 0.25,
};

type MarketListing = {
  title: string;
  snippet: string;
  link: string;
  source: string;
  price?: number;
};

const SOURCE_DOMAINS: Record<string, string[]> = {
  cars: ["olx.ro", "autovit.ro", "mobile.de"],
  real_estate: ["olx.ro", "storia.ro", "imobiliare.ro"],
  electronics: ["olx.ro", "emag.ro", "altex.ro"],
  appliances: ["olx.ro", "emag.ro", "altex.ro"],
  furniture: ["olx.ro", "ikea.com", "vinted.ro"],
  clothing: ["olx.ro", "vinted.ro"],
  sports: ["olx.ro", "decathlon.ro"],
  other: ["olx.ro", "publi24.ro", "anuntul.ro"],
};

function cleanText(value = "") {
  return value
    .replace(/[\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function buildSearchQuery(req: PriceRequest): string {
  const attrs = req.attributes || {};
  let title = req.title;

  // For cars, the exact model matters much more than the generic category.
  // Normalize common premium model notation before searching.
  if (req.category === "cars" && isBmwX5M(req)) {
    title = "BMW X5 M F85";
  }

  const queryParts = [
    title,
    req.category === "cars" ? "" : req.subcategory,
    attrs.marca || attrs.brand,
    attrs.model,
    attrs.an_fabricatie || attrs.an,
    attrs.kilometraj ? `${attrs.kilometraj} km` : "",
    attrs.suprafata ? `${attrs.suprafata} mp` : "",
  ].filter(Boolean);

  if (req.category === "cars") {
    return `${queryParts.join(" ")} vanzare pret EUR site:autovit.ro OR site:mobile.de OR site:autoscout24.com`;
  }

  const marketIntent = req.category === "real_estate"
    ? "vanzare pret EUR"
    : "second hand pret";

  const domains = SOURCE_DOMAINS[req.category] || SOURCE_DOMAINS.other;
  return `${queryParts.join(" ")} ${marketIntent} (${domains.map((d) => `site:${d}`).join(" OR ")})`;
}

function extractPriceRon(text: string): number | undefined {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");

  const eurPatterns = [
    /(?:€|eur)\s*([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{3,7})\b/i,
    /\b([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{3,7})(?:\s*)(€|eur)\b/i,
  ];

  for (const pattern of eurPatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const raw = (match[1] || "").replace(/[ .]/g, "");
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount * 5);
  }

  const ronPatterns = [
    /(?:pret|price)?\s*([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,7})(?:\s*)(lei|ron)\b/i,
    /\b([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,7})(?:\s*)(lei|ron)\b/i,
  ];

  for (const pattern of ronPatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const raw = (match[1] || "").replace(/[ .]/g, "");
    const amount = Number(raw);
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount);
  }

  return undefined;
}

function containsAny(text: string, words: string[]) {
  const lower = text.toLowerCase();
  return words.some((word) => lower.includes(word));
}

function normalizeModelText(req: PriceRequest) {
  const attrs = req.attributes || {};
  return cleanText([
    req.title,
    req.subcategory,
    attrs.marca || attrs.brand,
    attrs.model,
    attrs.an_fabricatie || attrs.an,
  ].filter(Boolean).join(" ")).toLowerCase();
}

function compactText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function isBmwX5M(req: PriceRequest) {
  const text = normalizeModelText(req);
  const compact = compactText(text);
  return compact.includes("bmwx5m") || compact.includes("x5m") || text.includes("x5 m") || text.includes("x5-m");
}

function isBmwX5(req: PriceRequest) {
  const text = normalizeModelText(req);
  const compact = compactText(text);
  return compact.includes("bmwx5") || text.includes("x5");
}

function isRelevantListing(req: PriceRequest, item: MarketListing): boolean {
  const text = `${item.title} ${item.snippet} ${item.link}`.toLowerCase();

  if (req.category === "cars") {
    const excluded = [
      "piese", "dezmembr", "dezmembrez", "jante", "anvelope", "cauciuc", "far", "stop", "bara", "bară",
      "capota", "oglinda", "motor ", "cutie", "injector", "turbina", "interior", "volan", "navigatie",
      "grila", "eleron", "folie", "inchiriez", "inchiriere", "renta", "macheta"
    ];
    if (containsAny(text, excluded)) return false;

    if (isBmwX5M(req)) {
      const compact = compactText(text);
      return compact.includes("x5m") || text.includes("x5 m") || text.includes("x5-m");
    }
    if (isBmwX5(req)) return text.includes("x5");
  }

  if (req.category === "real_estate") {
    const excluded = ["cazare", "inchiriere", "închiriere", "regim hotelier", "booking"];
    if (containsAny(text, excluded)) return false;
  }

  return true;
}

function minimumRelevantPriceRon(req: PriceRequest): number {
  const modelText = normalizeModelText(req);
  if (req.category === "cars") {
    if (isBmwX5M(req)) return 125_000;
    if (isBmwX5(req)) return 45_000;
    if (containsAny(modelText, ["bmw", "mercedes", "audi", "porsche", "lexus"])) return 20_000;
    return 5_000;
  }
  if (req.category === "real_estate") return 30_000;
  return 5;
}

function premiumSpecificRange(req: PriceRequest): { min: number; max: number } | null {
  const modelText = normalizeModelText(req);
  if (req.category === "cars") {
    // These are already second-hand market ranges in RON, not new-car values.
    // Do not apply heavy depreciation again in heuristicPrice().
    if (isBmwX5M(req)) return { min: 150_000, max: 230_000 }; // ~30k-46k EUR
    if (isBmwX5(req) && modelText.includes("bmw")) return { min: 55_000, max: 180_000 };
    if (modelText.includes("m5") && modelText.includes("bmw")) return { min: 100_000, max: 350_000 };
    if (modelText.includes("rs6") || modelText.includes("rs 6")) return { min: 120_000, max: 400_000 };
  }
  return null;
}

function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function removeOutliers(values: number[]): number[] {
  if (values.length < 4) return values;
  const med = median(values);
  return values.filter((v) => v >= med * 0.35 && v <= med * 2.8);
}

async function searchMarket(req: PriceRequest): Promise<MarketListing[]> {
  const serpApiKey = Deno.env.get("SERPAPI_KEY");
  if (!serpApiKey) return [];

  const query = buildSearchQuery(req);
  const url = new URL("https://serpapi.com/search.json");
  url.searchParams.set("engine", "google");
  url.searchParams.set("q", query);
  url.searchParams.set("google_domain", "google.ro");
  url.searchParams.set("gl", "ro");
  url.searchParams.set("hl", "ro");
  url.searchParams.set("num", "10");
  url.searchParams.set("api_key", serpApiKey);

  const response = await fetch(url.toString());
  if (!response.ok) return [];

  const data = await response.json();
  const organic = Array.isArray(data.organic_results) ? data.organic_results : [];
  const shopping = Array.isArray(data.shopping_results) ? data.shopping_results : [];

  const organicListings: MarketListing[] = organic.map((item: any) => {
    const title = cleanText(item.title);
    const snippet = cleanText(item.snippet || item.rich_snippet?.top?.detected_extensions?.price || "");
    const source = cleanText(item.source || new URL(item.link || "https://example.com").hostname.replace("www.", ""));
    const priceText = `${title} ${snippet} ${JSON.stringify(item.rich_snippet || {})}`;
    return { title, snippet, link: item.link, source, price: extractPriceRon(priceText) };
  });

  const shoppingListings: MarketListing[] = shopping.map((item: any) => {
    const title = cleanText(item.title);
    const snippet = cleanText(item.price || item.extracted_price || "");
    const source = cleanText(item.source || "Google Shopping");
    const priceText = `${title} ${snippet}`;
    return { title, snippet, link: item.link, source, price: extractPriceRon(priceText) };
  });

  return [...organicListings, ...shoppingListings].filter((item) => item.title || item.snippet);
}

function heuristicPrice(req: PriceRequest): PriceResponse {
  const categoryData = CATEGORY_BASE_PRICES[req.category] || CATEGORY_BASE_PRICES.other;
  const subKey = req.subcategory?.toLowerCase().replace(/ /g, "_") || "default";
  const specificRange = premiumSpecificRange(req);
  const baseRange = specificRange || categoryData[subKey] || categoryData.default;
  const conditionMult = CONDITION_MULTIPLIERS[req.condition] || 0.5;
  const attrs = req.attributes || {};

  const year = parseInt(attrs.an_fabricatie || attrs.an || "0");
  const age = year > 0 ? new Date().getFullYear() - year : 0;
  const yearFactor = age <= 0 ? 1 : age <= 3 ? 0.95 : age <= 6 ? 0.88 : age <= 10 ? 0.78 : 0.68;

  const km = parseInt((attrs.kilometraj || "0").replace(/[^0-9]/g, ""));
  const kmFactor = km <= 0 ? 1 : km < 80000 ? 1 : km < 160000 ? 0.92 : km < 260000 ? 0.82 : 0.7;

  const sqm = parseInt((attrs.suprafata || "0").replace(/[^0-9]/g, ""));
  const sqmFactor = sqm > 0 ? Math.max(0.5, Math.min(3.5, sqm / 70)) : 1;

  const brandText = `${attrs.marca || attrs.brand || ""} ${req.title}`.toLowerCase();
  const premiumBrands = ["bmw", "mercedes", "audi", "porsche", "lexus", "apple", "samsung", "sony", "lg"];
  const brandFactor = premiumBrands.some((b) => brandText.includes(b)) ? 1.15 : 1;

  let factor = conditionMult * brandFactor;

  if (req.category === "cars") {
    // For known premium models, baseRange is already a used-market range,
    // so condition/year/km should only fine tune, not depreciate twice.
    if (specificRange) {
      const carCondition: Record<string, number> = {
        new: 1.08,
        like_new: 1,
        good: 0.92,
        fair: 0.78,
        poor: 0.58,
      };
      factor = carCondition[req.condition] || 0.9;
      if (year > 0) factor *= yearFactor;
      if (km > 0) factor *= kmFactor;
      factor = Math.max(0.65, Math.min(1.15, factor));
    } else {
      factor *= yearFactor * kmFactor;
      factor = Math.max(0.15, Math.min(1.6, factor));
    }
  } else if (req.category === "real_estate") {
    factor *= sqmFactor;
    factor = Math.max(0.25, Math.min(3.5, factor));
  } else {
    factor *= yearFactor;
    factor = Math.max(0.08, Math.min(1.6, factor));
  }

  const raw = ((baseRange.min + baseRange.max) / 2) * factor;
  const suggested = Math.round(raw / 100) * 100;

  // Keep the displayed interval anchored to the known market range for special models.
  const priceMin = specificRange
    ? Math.round(Math.max(baseRange.min, suggested * 0.88) / 100) * 100
    : Math.round((suggested * 0.8) / 100) * 100;
  const priceMax = specificRange
    ? Math.round(Math.min(baseRange.max, suggested * 1.14) / 100) * 100
    : Math.round((suggested * 1.2) / 100) * 100;

  return {
    suggested_price: suggested,
    price_min: priceMin,
    price_max: priceMax,
    reasoning: `Estimare interna calculata din categorie, stare si caracteristici${specificRange ? ", cu interval special pentru model premium si preturi second-hand in EUR" : ""}. Pentru auto, cautarea live foloseste Autovit, mobile.de si AutoScout24 cand SERPAPI_KEY este configurat.`,
    market_sources: ["Estimare interna", ...(SOURCE_DOMAINS[req.category] || SOURCE_DOMAINS.other)],
    confidence: Object.keys(attrs).length >= 3 ? "medium" : "low",
  };
}

async function calculatePrice(req: PriceRequest): Promise<PriceResponse> {
  const fallback = heuristicPrice(req);
  const listings = await searchMarket(req);
  const minRelevant = minimumRelevantPriceRon(req);

  const relevantListings = listings.filter((item) => isRelevantListing(req, item));
  const pricedListings = relevantListings
    .filter((item) => typeof item.price === "number" && item.price >= minRelevant) as Array<MarketListing & { price: number }>;

  const cleanedPrices = removeOutliers(pricedListings.map((item) => item.price));

  if (cleanedPrices.length < 3) {
    const fallbackEur = Math.round(fallback.suggested_price / 5 / 100) * 100;
    return {
      ...fallback,
      reasoning: `${fallback.reasoning} Nu am gasit suficiente preturi publice comparabile dupa filtrarea rezultatelor irelevante (${cleanedPrices.length} rezultate cu pret valid). Estimarea este aproximativ ${fallbackEur.toLocaleString("ro-RO")} EUR / ${fallback.suggested_price.toLocaleString("ro-RO")} RON.`,
      market_sources: Array.from(new Set([...fallback.market_sources, ...relevantListings.slice(0, 5).map((item) => item.source)])),
    };
  }

  const med = median(cleanedPrices);

  // Guardrail: if live results are implausibly lower than the internal model,
  // keep the internal model. This avoids parts/accessories being priced as cars.
  if ((req.category === "cars" || req.category === "real_estate") && med < fallback.suggested_price * 0.55) {
    const fallbackEur = Math.round(fallback.suggested_price / 5 / 100) * 100;
    return {
      ...fallback,
      reasoning: `Am gasit preturi live, dar mediana (${Math.round(med).toLocaleString("ro-RO")} RON) este prea mica fata de modelul estimat, deci probabil include piese, accesorii sau anunturi nerelevante. Recomandarea foloseste filtrare premium si interval logic pentru produs: aproximativ ${fallbackEur.toLocaleString("ro-RO")} EUR / ${fallback.suggested_price.toLocaleString("ro-RO")} RON.`,
      market_sources: Array.from(new Set([...pricedListings.slice(0, 6).map((item) => item.source), "Filtru anti-outliers"])),
      confidence: "medium",
    };
  }

  const sorted = [...cleanedPrices].sort((a, b) => a - b);
  const suggested = Math.round(med / 100) * 100;
  const lowHalf = sorted.slice(0, Math.max(1, Math.floor(sorted.length / 2)));
  const highHalf = sorted.slice(Math.floor(sorted.length / 2));
  const priceMin = Math.round((median(lowHalf) * 0.95) / 100) * 100;
  const priceMax = Math.round((median(highHalf) * 1.05) / 100) * 100;

  const sources = Array.from(new Set(pricedListings.slice(0, 8).map((item) => item.source)));
  const examples = pricedListings
    .slice(0, 4)
    .map((item) => `${item.source}: ${item.price.toLocaleString("ro-RO")} RON (~${Math.round(item.price / 5).toLocaleString("ro-RO")} EUR)`)
    .join("; ");

  return {
    suggested_price: suggested,
    price_min: Math.min(priceMin, suggested),
    price_max: Math.max(priceMax, suggested),
    reasoning: `Pret calculat din cautare live pe piata second-hand. Am filtrat rezultatele irelevante si am pastrat ${cleanedPrices.length} preturi comparabile pentru „${req.title}”. Exemple: ${examples}. Recomandarea este aproximativ ${Math.round(suggested / 5).toLocaleString("ro-RO")} EUR / ${suggested.toLocaleString("ro-RO")} RON.`,
    market_sources: sources.length ? sources : ["OLX.ro", "AutoVit.ro", "Storia.ro"],
    confidence: cleanedPrices.length >= 6 ? "high" : "medium",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body: PriceRequest = await req.json();

    if (!body.title || !body.category || !body.condition) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: title, category, condition" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await calculatePrice(body);

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
