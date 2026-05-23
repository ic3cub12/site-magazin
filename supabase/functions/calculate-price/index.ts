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

type MarketListing = {
  title: string;
  snippet: string;
  link: string;
  source: string;
  price?: number;
  score: number;
};

const EUR_TO_RON = 5;

const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  like_new: 0.88,
  good: 0.72,
  fair: 0.52,
  poor: 0.32,
};

const SOURCE_DOMAINS: Record<string, string[]> = {
  cars: ["autovit.ro", "mobile.de", "autoscout24.com", "olx.ro"],
  real_estate: ["imobiliare.ro", "storia.ro", "olx.ro", "publi24.ro"],
  electronics: ["olx.ro", "emag.ro", "altex.ro"],
  appliances: ["olx.ro", "emag.ro", "altex.ro"],
  furniture: ["olx.ro", "ikea.com"],
  clothing: ["olx.ro", "vinted.ro"],
  sports: ["olx.ro", "decathlon.ro"],
  other: ["olx.ro", "publi24.ro", "anuntul.ro"],
};

function cleanText(value = "") {
  return value.replace(/[\n\t]+/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(value = "") {
  return value.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

function compactText(value = "") {
  return normalize(value).replace(/[^a-z0-9]/g, "");
}

function num(value?: string) {
  const n = Number((value || "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

function attrs(req: PriceRequest) {
  return req.attributes || {};
}

function carName(req: PriceRequest) {
  const a = attrs(req);
  return cleanText([a.marca, a.model, a.generatie, req.title].filter(Boolean).join(" "));
}

function isBmwX5M(req: PriceRequest) {
  const c = compactText(carName(req));
  return c.includes("bmwx5m") || c.includes("x5m");
}

function includesAny(text: string, words: string[]) {
  const t = normalize(text);
  return words.some((word) => t.includes(normalize(word)));
}

function extractPriceRon(text: string): number | undefined {
  const normalized = text
    .replace(/\u00a0/g, " ")
    .replace(/,/g, ".")
    .replace(/\s+/g, " ");

  const eurPatterns = [
    /(?:€|eur)\s*([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{4,8})\b/i,
    /\b([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{4,8})(?:\s*)(€|eur)\b/i,
  ];

  for (const pattern of eurPatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const amount = Number((match[1] || "").replace(/[ .]/g, ""));
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount * EUR_TO_RON);
  }

  const ronPatterns = [
    /(?:pret|price)?\s*([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,8})(?:\s*)(lei|ron)\b/i,
    /\b([0-9]{1,3}(?:[ .][0-9]{3})+|[0-9]{2,8})(?:\s*)(lei|ron)\b/i,
  ];

  for (const pattern of ronPatterns) {
    const match = normalized.match(pattern);
    if (!match) continue;
    const amount = Number((match[1] || "").replace(/[ .]/g, ""));
    if (Number.isFinite(amount) && amount > 0) return Math.round(amount);
  }

  return undefined;
}

function carQueryParts(req: PriceRequest) {
  const a = attrs(req);
  const parts = [
    a.marca,
    a.model,
    a.generatie,
    a.an_fabricatie,
    a.motorizare,
    a.putere_cp ? `${a.putere_cp} cp` : "",
    a.combustibil,
  ].filter(Boolean);

  const fallback = req.title;
  return cleanText(parts.join(" ") || fallback);
}

function buildSearchQueries(req: PriceRequest): string[] {
  const a = attrs(req);

  if (req.category === "cars") {
    const exact = carQueryParts(req);
    const year = a.an_fabricatie ? `${a.an_fabricatie}` : "";
    const km = a.kilometraj ? `${a.kilometraj} km` : "";
    return [
      `${exact} ${year} ${km} pret vanzare site:autovit.ro`,
      `${exact} ${year} gebrauchtwagen preis site:mobile.de`,
      `${exact} ${year} used car price site:autoscout24.com`,
      `${exact} ${year} ${km} vanzare auto site:olx.ro`,
    ].map(cleanText);
  }

  if (req.category === "real_estate") {
    const exact = cleanText([req.subcategory, a.oras, a.zona, a.suprafata ? `${a.suprafata} mp` : "", a.nr_camere ? `${a.nr_camere} camere` : ""].filter(Boolean).join(" "));
    const domains = SOURCE_DOMAINS.real_estate.map((d) => `site:${d}`).join(" OR ");
    return [`${exact || req.title} vanzare pret EUR (${domains})`];
  }

  const domains = (SOURCE_DOMAINS[req.category] || SOURCE_DOMAINS.other).map((d) => `site:${d}`).join(" OR ");
  return [`${req.title} ${a.marca || ""} ${a.model || ""} second hand pret (${domains})`];
}

function carExclusion(text: string) {
  return includesAny(text, [
    "piese", "dezmembr", "dezmembrez", "jante", "anvelope", "cauciuc", "far", "stop", "bara", "bară",
    "capota", "oglinda", "motor ", "cutie viteze", "injector", "turbina", "interior", "volan", "navigatie",
    "grila", "eleron", "folie", "inchiriez", "inchiriere", "rent", "leasing operational", "macheta", "miniatura",
  ]);
}

function extractYear(text: string): number | undefined {
  const years = [...text.matchAll(/\b(19[8-9][0-9]|20[0-3][0-9])\b/g)].map((m) => Number(m[1]));
  return years.find((y) => y >= 1980 && y <= new Date().getFullYear() + 1);
}

function carSimilarityScore(req: PriceRequest, item: Omit<MarketListing, "score">): number {
  const a = attrs(req);
  const text = normalize(`${item.title} ${item.snippet} ${item.link}`);
  const compact = compactText(text);
  let score = 0;

  const brand = normalize(a.marca || "");
  const model = normalize(a.model || "");
  const generation = normalize(a.generatie || "");
  const fuel = normalize(a.combustibil || "");

  if (brand && text.includes(brand)) score += 25;
  if (model && compact.includes(compactText(model))) score += 35;
  if (generation && compact.includes(compactText(generation))) score += 20;
  if (fuel && text.includes(fuel)) score += 8;

  const year = num(a.an_fabricatie);
  const foundYear = extractYear(text);
  if (year && foundYear) {
    const diff = Math.abs(year - foundYear);
    if (diff === 0) score += 20;
    else if (diff <= 1) score += 14;
    else if (diff <= 2) score += 8;
    else score -= 20;
  }

  const hp = num(a.putere_cp);
  if (hp) {
    const hpMin = Math.round(hp * 0.85);
    const hpMax = Math.round(hp * 1.15);
    const hpPattern = new RegExp(`\\b(${hpMin}|${hp}|${hpMax}|[0-9]{3})\\s*(cp|hp|ps)\\b`, "i");
    if (hpPattern.test(text)) score += 8;
  }

  if (isBmwX5M(req)) {
    if (compact.includes("x5m") || text.includes("x5 m")) score += 45;
    else score -= 100;
    if (a.generatie && !compact.includes(compactText(a.generatie))) score -= 15;
  }

  return score;
}

function generalSimilarityScore(req: PriceRequest, item: Omit<MarketListing, "score">): number {
  if (req.category === "cars") return carSimilarityScore(req, item);
  const text = normalize(`${item.title} ${item.snippet}`);
  const words = normalize(req.title).split(/\s+/).filter((w) => w.length > 2);
  return words.reduce((score, word) => score + (text.includes(word) ? 10 : 0), 0);
}

function minimumRelevantPriceRon(req: PriceRequest): number {
  const a = attrs(req);
  if (req.category === "cars") {
    const profile = carValueProfile(req);
    return Math.round(profile.minEur * EUR_TO_RON * 0.72);
  }
  if (req.category === "real_estate") return 25_000;
  return 5;
}

async function searchOne(query: string): Promise<Omit<MarketListing, "score">[]> {
  const serpApiKey = Deno.env.get("SERPAPI_KEY");
  if (!serpApiKey) return [];

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
  return organic.map((item: any) => {
    const title = cleanText(item.title || "");
    const snippet = cleanText(item.snippet || item.rich_snippet?.top?.detected_extensions?.price || "");
    const link = item.link || "";
    const source = cleanText(item.source || (link ? new URL(link).hostname.replace("www.", "") : "Google"));
    const priceText = `${title} ${snippet} ${JSON.stringify(item.rich_snippet || {})}`;
    return { title, snippet, link, source, price: extractPriceRon(priceText) };
  });
}

async function searchMarket(req: PriceRequest): Promise<MarketListing[]> {
  const queries = buildSearchQueries(req);
  const results = (await Promise.all(queries.map(searchOne))).flat();
  const seen = new Set<string>();
  return results
    .filter((item) => item.title || item.snippet)
    .filter((item) => {
      const key = item.link || `${item.title}-${item.snippet}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((item) => ({ ...item, score: generalSimilarityScore(req, item) }));
}

function median(values: number[]): number {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

function trimOutliers(values: number[]): number[] {
  if (values.length < 5) return values;
  const med = median(values);
  return values.filter((v) => v >= med * 0.55 && v <= med * 1.65);
}

function carValueProfile(req: PriceRequest) {
  const a = attrs(req);
  const text = compactText([a.marca, a.model, a.generatie, a.varianta_trim, req.title, req.description].filter(Boolean).join(" "));
  const year = num(a.an_fabricatie) || new Date().getFullYear() - 7;

  // Values are EUR mid-market estimates for clean, sellable second-hand vehicles.
  // They intentionally act as a guardrail when live search returns parts/dezmembrari/wrong trims.
  if ((text.includes("bmwx5m") || text.includes("x5m")) && (text.includes("f85") || (year >= 2015 && year <= 2018))) {
    return { minEur: 30000, midEur: 38500, maxEur: 50000, label: "BMW X5 M F85" };
  }
  if ((text.includes("bmwx5m") || text.includes("x5m")) && (text.includes("g05") || year >= 2019)) {
    return { minEur: 62000, midEur: 78000, maxEur: 105000, label: "BMW X5 M G05" };
  }
  if (text.includes("bmwx5") || text.includes("x5")) {
    if (year >= 2019) return { minEur: 35000, midEur: 52000, maxEur: 85000, label: "BMW X5 G05" };
    if (year >= 2014) return { minEur: 18000, midEur: 28500, maxEur: 45000, label: "BMW X5 F15/F85" };
  }

  const premiumPerformance = ["amg", "rs", "mcompetition", "competition", "porsche", "m5", "m3", "m4", "gle63", "glc63", "rs6", "rsq8"].some((w) => text.includes(w));
  if (premiumPerformance) return { minEur: 28000, midEur: 52000, maxEur: 110000, label: "model premium/performance" };

  const premium = ["bmw", "mercedes", "audi", "porsche", "lexus", "landrover", "rangerover", "volvo", "jaguar"].some((w) => text.includes(w));
  if (premium) {
    if (year >= 2021) return { minEur: 28000, midEur: 48000, maxEur: 90000, label: "model premium recent" };
    if (year >= 2016) return { minEur: 13000, midEur: 26000, maxEur: 55000, label: "model premium second-hand" };
    return { minEur: 7000, midEur: 15000, maxEur: 35000, label: "model premium vechi" };
  }

  if (year >= 2021) return { minEur: 12000, midEur: 22000, maxEur: 45000, label: "auto recent" };
  if (year >= 2016) return { minEur: 6000, midEur: 12000, maxEur: 28000, label: "auto second-hand" };
  return { minEur: 2500, midEur: 6500, maxEur: 15000, label: "auto vechi" };
}

function carAdjustmentFactor(req: PriceRequest) {
  const a = attrs(req);
  const year = num(a.an_fabricatie) || new Date().getFullYear() - 7;
  const km = num(a.kilometraj) || 150000;
  let factor = 1;

  const age = new Date().getFullYear() - year;
  if (age <= 2) factor *= 1.12;
  else if (age <= 5) factor *= 1.05;
  else if (age <= 8) factor *= 1.0;
  else if (age <= 12) factor *= 0.9;
  else factor *= 0.78;

  if (km < 40000) factor *= 1.14;
  else if (km < 90000) factor *= 1.07;
  else if (km < 150000) factor *= 1.0;
  else if (km < 220000) factor *= 0.89;
  else factor *= 0.73;

  const conditionFactor = CONDITION_MULTIPLIERS[req.condition] || 0.72;
  factor *= 0.78 + conditionFactor * 0.28;

  const service = normalize(a.istoric_service || "");
  if (service.includes("reprezentanta")) factor *= 1.06;
  else if (service.includes("complet")) factor *= 1.035;
  else if (service.includes("nu exista")) factor *= 0.92;

  const damage = normalize(a.daune || "");
  if (damage.includes("fara")) factor *= 1.03;
  else if (damage.includes("minore")) factor *= 0.94;
  else if (damage.includes("reparate")) factor *= 0.88;
  else if (damage.includes("majore")) factor *= 0.7;

  if (normalize(a.tva_deductibil || "") === "da") factor *= 1.03;
  return Math.max(0.55, Math.min(1.35, factor));
}

function roundEur(value: number) {
  if (value >= 30000) return Math.round(value / 500) * 500;
  if (value >= 10000) return Math.round(value / 250) * 250;
  return Math.round(value / 100) * 100;
}

function carHeuristic(req: PriceRequest): PriceResponse {
  const a = attrs(req);
  const profile = carValueProfile(req);
  const factor = carAdjustmentFactor(req);

  const suggestedEur = roundEur(profile.midEur * factor);
  const minEur = roundEur(Math.max(profile.minEur, suggestedEur * 0.84));
  const maxEur = roundEur(Math.min(profile.maxEur, suggestedEur * 1.18));

  const details = [
    a.marca && `marca ${a.marca}`,
    a.model && `model ${a.model}`,
    a.generatie && `generatie ${a.generatie}`,
    a.an_fabricatie && `an ${a.an_fabricatie}`,
    a.kilometraj && `${Number(a.kilometraj).toLocaleString("ro-RO")} km`,
    a.motorizare && `motor ${a.motorizare}`,
    a.putere_cp && `${a.putere_cp} CP`,
    a.combustibil,
    a.cutl_viteze || a.cutie_viteze,
    a.tractiune,
    a.istoric_service && `service: ${a.istoric_service}`,
    a.daune && `daune: ${a.daune}`,
  ].filter(Boolean).join(", ");

  return {
    suggested_price: suggestedEur * EUR_TO_RON,
    price_min: minEur * EUR_TO_RON,
    price_max: maxEur * EUR_TO_RON,
    reasoning: `Estimare auto Pro pentru ${profile.label}. Am folosit datele introduse (${details || "date limitate"}) si praguri de piata pentru a evita rezultate gresite de tip piese/dezmembrari sau modele inferioare. Recomandare: ~${suggestedEur.toLocaleString("ro-RO")} EUR / ${(suggestedEur * EUR_TO_RON).toLocaleString("ro-RO")} RON. Pentru precizie maxima completeaza generatia, motorizarea, CP, km, service si daune.`,
    market_sources: ["Auto Valuation Pro", "autovit.ro", "mobile.de", "autoscout24.com", "olx.ro/auto"],
    confidence: [a.marca, a.model, a.generatie, a.an_fabricatie, a.kilometraj, a.combustibil, a.putere_cp].filter(Boolean).length >= 6 ? "high" : "medium",
  };
}

function realEstateHeuristic(req: PriceRequest): PriceResponse {
  const a = attrs(req);
  const sqm = num(a.suprafata) || 60;
  const city = normalize(a.oras || "");
  let eurPerSqm = 1200;
  if (includesAny(city, ["bucuresti", "cluj", "brasov", "timisoara"])) eurPerSqm = 1900;
  if (includesAny(normalize(a.zona || ""), ["herastrau", "primaverii", "floreasca", "aviatorilor"])) eurPerSqm = 3200;
  if (normalize(req.subcategory || "").includes("teren")) eurPerSqm = includesAny(city, ["bucuresti", "cluj"]) ? 250 : 80;

  const suggested = Math.round((sqm * eurPerSqm * EUR_TO_RON) / 1000) * 1000;
  return {
    suggested_price: suggested,
    price_min: Math.round((suggested * 0.85) / 1000) * 1000,
    price_max: Math.round((suggested * 1.18) / 1000) * 1000,
    reasoning: `Estimare imobiliara bazata pe zona, oras si suprafata. Pentru precizie mai mare, completeaza zona exacta, mp, camere, anul constructiei si utilitatile terenului.`,
    market_sources: ["Model imobiliar", "imobiliare.ro", "storia.ro", "olx.ro"],
    confidence: [a.oras, a.zona, a.suprafata].filter(Boolean).length >= 3 ? "medium" : "low",
  };
}

function genericHeuristic(req: PriceRequest): PriceResponse {
  const baseByCategory: Record<string, [number, number]> = {
    electronics: [200, 3500], appliances: [150, 2500], furniture: [100, 3000], clothing: [20, 600], sports: [50, 5000], other: [50, 3000],
  };
  const [min, max] = baseByCategory[req.category] || baseByCategory.other;
  const factor = CONDITION_MULTIPLIERS[req.condition] || 0.6;
  const suggested = Math.round(((min + max) / 2) * factor / 10) * 10;
  return {
    suggested_price: suggested,
    price_min: Math.round(suggested * 0.75 / 10) * 10,
    price_max: Math.round(suggested * 1.25 / 10) * 10,
    reasoning: "Estimare generala bazata pe categorie si stare. Pentru rezultate mai bune, completeaza marca, modelul, anul si descrierea.",
    market_sources: SOURCE_DOMAINS[req.category] || SOURCE_DOMAINS.other,
    confidence: "low",
  };
}

function fallbackPrice(req: PriceRequest): PriceResponse {
  if (req.category === "cars") return carHeuristic(req);
  if (req.category === "real_estate") return realEstateHeuristic(req);
  return genericHeuristic(req);
}

async function calculatePrice(req: PriceRequest): Promise<PriceResponse> {
  const fallback = fallbackPrice(req);
  const listings = await searchMarket(req);
  const minPrice = minimumRelevantPriceRon(req);

  const candidates = listings
    .filter((item) => !(req.category === "cars" && carExclusion(`${item.title} ${item.snippet} ${item.link}`)))
    .filter((item) => (item.price || 0) >= minPrice)
    .filter((item) => item.score >= (req.category === "cars" ? 45 : 20)) as Array<MarketListing & { price: number }>;

  const cleaned = trimOutliers(candidates.map((item) => item.price));

  if (cleaned.length < 3) {
    const eur = Math.round(fallback.suggested_price / EUR_TO_RON / 100) * 100;
    return {
      ...fallback,
      reasoning: `${fallback.reasoning} Nu am gasit minimum 3 comparabile live suficient de apropiate dupa filtrele de similaritate (${cleaned.length} rezultate valide). Folosesc estimarea interna: ~${eur.toLocaleString("ro-RO")} EUR / ${fallback.suggested_price.toLocaleString("ro-RO")} RON.`,
      market_sources: Array.from(new Set([...fallback.market_sources, ...candidates.slice(0, 5).map((item) => item.source)])),
    };
  }

  const med = median(cleaned);
  if (req.category === "cars") {
    const lowGuard = fallback.price_min * 0.82;
    const highGuard = fallback.price_max * 1.22;
    if (med < lowGuard || med > highGuard) {
      return {
        ...fallback,
        reasoning: `${fallback.reasoning} Am gasit rezultate live, dar mediana (${Math.round(med / EUR_TO_RON).toLocaleString("ro-RO")} EUR) este in afara intervalului realist pentru datele introduse. Am ignorat comparabilele suspecte si am pastrat evaluarea Pro.`,
        market_sources: Array.from(new Set([...fallback.market_sources, ...candidates.slice(0, 6).map((item) => item.source), "Filtru similaritate strict"])),
        confidence: fallback.confidence,
      };
    }
  } else if ((req.category === "real_estate") && med < fallback.suggested_price * 0.55) {
    return {
      ...fallback,
      reasoning: `${fallback.reasoning} Am gasit rezultate live, dar preturile sunt prea mici fata de modelul detaliat si probabil includ anunturi nepotrivite. Am protejat estimarea folosind praguri pe categorie si matching dupa campuri.`,
      market_sources: Array.from(new Set([...candidates.slice(0, 6).map((item) => item.source), "Filtru similaritate"])),
      confidence: "medium",
    };
  }

  const blended = req.category === "cars" ? (med * 0.45 + fallback.suggested_price * 0.55) : med;
  const suggested = Math.round(blended / 500) * 500;
  const sorted = [...cleaned].sort((a, b) => a - b);
  const priceMin = Math.round(sorted[Math.max(0, Math.floor(sorted.length * 0.25))] / 500) * 500;
  const priceMax = Math.round(sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * 0.75))] / 500) * 500;
  const examples = candidates.slice(0, 4).map((item) => `${item.source}: ~${Math.round(item.price / EUR_TO_RON).toLocaleString("ro-RO")} EUR, scor ${item.score}`).join("; ");

  return {
    suggested_price: suggested,
    price_min: Math.min(priceMin, suggested),
    price_max: Math.max(priceMax, suggested),
    reasoning: `Pret calculat din comparabile live cu matching dupa datele introduse. Am folosit ${cleaned.length} rezultate dupa filtrare. Exemple: ${examples}. Recomandare: ~${Math.round(suggested / EUR_TO_RON).toLocaleString("ro-RO")} EUR / ${suggested.toLocaleString("ro-RO")} RON.`,
    market_sources: Array.from(new Set(candidates.slice(0, 8).map((item) => item.source))),
    confidence: cleaned.length >= 6 ? "high" : "medium",
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 200, headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const body: PriceRequest = await req.json();
    if (!body.title || !body.category || !body.condition) {
      return new Response(JSON.stringify({ error: "Missing required fields: title, category, condition" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const result = await calculatePrice(body);
    return new Response(JSON.stringify(result), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});
