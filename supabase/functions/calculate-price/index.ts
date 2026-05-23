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
  const important = [
    req.title,
    req.subcategory,
    attrs.marca || attrs.brand,
    attrs.model,
    attrs.an_fabricatie || attrs.an,
    attrs.kilometraj ? `${attrs.kilometraj} km` : "",
    attrs.suprafata ? `${attrs.suprafata} mp` : "",
    attrs.stocare || attrs.capacitate,
    "second hand pret",
  ].filter(Boolean);

  const domains = SOURCE_DOMAINS[req.category] || SOURCE_DOMAINS.other;
  return `${important.join(" ")} (${domains.map((d) => `site:${d}`).join(" OR ")})`;
}

function parseRonPrice(text: string): number | undefined {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");

  const patterns = [
    /(?:pret|price)?\s*([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,7})(?:\s*)(lei|ron)\b/i,
    /(?:€|eur)\s*([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,7})\b/i,
    /\b([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,7})(?:\s*)(€|eur)\b/i,
  ];

  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (!match) continue;

    const amountText = (match[1] || match[2] || "").replace(/[ .]/g, "");
    const amount = Number(amountText);
    if (!Number.isFinite(amount) || amount <= 0) continue;

    const currency = normalized.slice(match.index || 0, (match.index || 0) + match[0].length).toLowerCase();
    const priceRon = currency.includes("€") || currency.includes("eur") ? amount * 5 : amount;

    if (priceRon >= 5 && priceRon <= 10_000_000) return Math.round(priceRon);
  }

  return undefined;
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
    return { title, snippet, link: item.link, source, price: parseRonPrice(priceText) };
  });

  const shoppingListings: MarketListing[] = shopping.map((item: any) => {
    const title = cleanText(item.title);
    const snippet = cleanText(item.price || item.extracted_price || "");
    const source = cleanText(item.source || "Google Shopping");
    const priceText = `${title} ${snippet}`;
    return { title, snippet, link: item.link, source, price: parseRonPrice(priceText) };
  });

  return [...organicListings, ...shoppingListings].filter((item) => item.title || item.snippet);
}

function heuristicPrice(req: PriceRequest): PriceResponse {
  const categoryData = CATEGORY_BASE_PRICES[req.category] || CATEGORY_BASE_PRICES.other;
  const subKey = req.subcategory?.toLowerCase().replace(/ /g, "_") || "default";
  const baseRange = categoryData[subKey] || categoryData.default;
  const conditionMult = CONDITION_MULTIPLIERS[req.condition] || 0.5;
  const attrs = req.attributes || {};

  const year = parseInt(attrs.an_fabricatie || attrs.an || "0");
  const age = year > 0 ? new Date().getFullYear() - year : 0;
  const yearFactor = age <= 0 ? 1 : age <= 3 ? 0.85 : age <= 6 ? 0.7 : age <= 10 ? 0.52 : 0.35;

  const km = parseInt((attrs.kilometraj || "0").replace(/[^0-9]/g, ""));
  const kmFactor = km <= 0 ? 1 : km < 80000 ? 0.9 : km < 160000 ? 0.72 : km < 260000 ? 0.55 : 0.38;

  const sqm = parseInt((attrs.suprafata || "0").replace(/[^0-9]/g, ""));
  const sqmFactor = sqm > 0 ? Math.max(0.5, Math.min(3.5, sqm / 70)) : 1;

  const brand = (attrs.marca || attrs.brand || "").toLowerCase();
  const premiumBrands = ["bmw", "mercedes", "audi", "porsche", "lexus", "apple", "samsung", "sony", "lg"];
  const brandFactor = premiumBrands.some((b) => brand.includes(b)) ? 1.25 : 1;

  let factor = conditionMult * brandFactor;
  if (req.category === "cars") factor *= yearFactor * kmFactor;
  else if (req.category === "real_estate") factor *= sqmFactor;
  else factor *= yearFactor;

  factor = Math.max(0.08, Math.min(1.6, factor));
  const raw = ((baseRange.min + baseRange.max) / 2) * factor;
  const suggested = Math.round(raw / 10) * 10;
  const priceMin = Math.round((suggested * 0.8) / 10) * 10;
  const priceMax = Math.round((suggested * 1.2) / 10) * 10;

  return {
    suggested_price: suggested,
    price_min: priceMin,
    price_max: priceMax,
    reasoning: `Estimare interna calculata din categorie, stare si caracteristici. Pentru comparatie live cu OLX/Autovit/Storia, adauga SERPAPI_KEY in Supabase Edge Function secrets.`,
    market_sources: ["Estimare interna", ...(SOURCE_DOMAINS[req.category] || SOURCE_DOMAINS.other)],
    confidence: Object.keys(attrs).length >= 3 ? "medium" : "low",
  };
}

async function calculatePrice(req: PriceRequest): Promise<PriceResponse> {
  const fallback = heuristicPrice(req);
  const listings = await searchMarket(req);
  const pricedListings = listings.filter((item) => typeof item.price === "number") as Array<MarketListing & { price: number }>;
  const cleanedPrices = removeOutliers(pricedListings.map((item) => item.price));

  if (cleanedPrices.length < 3) {
    return {
      ...fallback,
      reasoning: `${fallback.reasoning} Nu am gasit suficiente preturi publice comparabile in cautarea live (${cleanedPrices.length} rezultate cu pret detectat).`,
      market_sources: Array.from(new Set([...fallback.market_sources, ...listings.slice(0, 5).map((item) => item.source)])),
    };
  }

  const med = median(cleanedPrices);
  const conditionMultiplier = CONDITION_MULTIPLIERS[req.condition] || 0.65;
  const suggested = Math.round((med * (0.85 + conditionMultiplier * 0.25)) / 10) * 10;
  const priceMin = Math.round((median(cleanedPrices.slice(0, Math.max(1, Math.floor(cleanedPrices.length / 2)))) * 0.9) / 10) * 10;
  const priceMax = Math.round((median(cleanedPrices.slice(Math.floor(cleanedPrices.length / 2))) * 1.1) / 10) * 10;

  const sources = Array.from(new Set(pricedListings.slice(0, 8).map((item) => item.source)));
  const examples = pricedListings
    .slice(0, 4)
    .map((item) => `${item.source}: ${item.price.toLocaleString("ro-RO")} RON`)
    .join("; ");

  return {
    suggested_price: suggested,
    price_min: Math.min(priceMin, suggested),
    price_max: Math.max(priceMax, suggested),
    reasoning: `Pret calculat din cautare live pe piata second-hand. Am comparat anunturi similare pentru „${req.title}” si am extras ${cleanedPrices.length} preturi relevante. Exemple: ${examples}. Recomandarea tine cont si de starea produsului.`,
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
