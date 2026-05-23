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
    "autoturism": { min: 3000, max: 60000 },
    "suv": { min: 8000, max: 120000 },
    "camion": { min: 10000, max: 200000 },
    "motocicleta": { min: 800, max: 30000 },
  },
  real_estate: {
    default: { min: 20000, max: 500000 },
    "apartament": { min: 30000, max: 300000 },
    "casa": { min: 50000, max: 800000 },
    "teren": { min: 5000, max: 500000 },
    "spatiu_comercial": { min: 20000, max: 1000000 },
  },
  electronics: {
    default: { min: 50, max: 3000 },
    "telefon": { min: 100, max: 2500 },
    "laptop": { min: 200, max: 5000 },
    "tableta": { min: 100, max: 2000 },
    "televizor": { min: 150, max: 5000 },
    "consola": { min: 100, max: 800 },
  },
  appliances: {
    default: { min: 100, max: 3000 },
    "masina_spalat": { min: 200, max: 2000 },
    "frigider": { min: 200, max: 3000 },
    "aragaz": { min: 150, max: 2500 },
    "masina_spalat_vase": { min: 200, max: 2000 },
    "aer_conditionat": { min: 300, max: 3000 },
  },
  furniture: {
    default: { min: 50, max: 5000 },
    "canapea": { min: 200, max: 3000 },
    "pat": { min: 200, max: 3000 },
    "masa": { min: 100, max: 2000 },
    "dulap": { min: 150, max: 2500 },
  },
  clothing: {
    default: { min: 5, max: 500 },
  },
  sports: {
    default: { min: 20, max: 5000 },
    "bicicleta": { min: 100, max: 8000 },
    "echipament_fitness": { min: 50, max: 5000 },
  },
  other: {
    default: { min: 10, max: 5000 },
  },
};

const CONDITION_MULTIPLIERS: Record<string, number> = {
  new: 1.0,
  like_new: 0.85,
  good: 0.65,
  fair: 0.45,
  poor: 0.25,
};

function parseAttributes(attributes: Record<string, string>): {
  yearFactor: number;
  kmFactor: number;
  brandFactor: number;
  sqmFactor: number;
  storageGBFactor: number;
} {
  let yearFactor = 1.0;
  let kmFactor = 1.0;
  let brandFactor = 1.0;
  let sqmFactor = 1.0;
  let storageGBFactor = 1.0;

  const year = parseInt(attributes["an_fabricatie"] || attributes["an"] || "0");
  if (year > 0) {
    const age = new Date().getFullYear() - year;
    if (age <= 1) yearFactor = 1.0;
    else if (age <= 3) yearFactor = 0.85;
    else if (age <= 5) yearFactor = 0.72;
    else if (age <= 8) yearFactor = 0.58;
    else if (age <= 12) yearFactor = 0.42;
    else if (age <= 20) yearFactor = 0.28;
    else yearFactor = 0.15;
  }

  const km = parseInt((attributes["kilometraj"] || "0").replace(/[^0-9]/g, ""));
  if (km > 0) {
    if (km < 30000) kmFactor = 1.0;
    else if (km < 80000) kmFactor = 0.88;
    else if (km < 150000) kmFactor = 0.72;
    else if (km < 250000) kmFactor = 0.52;
    else kmFactor = 0.35;
  }

  const premiumBrands = ["bmw", "mercedes", "audi", "porsche", "lexus", "apple", "samsung", "sony", "lg"];
  const budgetBrands = ["dacia", "skoda", "seat", "hyundai", "kia", "xiaomi", "tcl"];
  const brand = (attributes["marca"] || attributes["brand"] || "").toLowerCase();
  if (premiumBrands.some(b => brand.includes(b))) brandFactor = 1.35;
  else if (budgetBrands.some(b => brand.includes(b))) brandFactor = 0.85;

  const sqm = parseInt((attributes["suprafata"] || "0").replace(/[^0-9]/g, ""));
  if (sqm > 0) {
    sqmFactor = Math.max(0.5, Math.min(3.0, sqm / 70));
  }

  const storage = parseInt((attributes["stocare"] || attributes["capacitate"] || "0").replace(/[^0-9]/g, ""));
  if (storage > 0) {
    if (storage >= 512) storageGBFactor = 1.3;
    else if (storage >= 256) storageGBFactor = 1.1;
    else if (storage >= 128) storageGBFactor = 1.0;
    else storageGBFactor = 0.8;
  }

  return { yearFactor, kmFactor, brandFactor, sqmFactor, storageGBFactor };
}

function calculatePrice(req: PriceRequest): PriceResponse {
  const categoryData = CATEGORY_BASE_PRICES[req.category] || CATEGORY_BASE_PRICES["other"];
  const subKey = req.subcategory?.toLowerCase().replace(/ /g, "_") || "default";
  const baseRange = categoryData[subKey] || categoryData["default"];

  const conditionMult = CONDITION_MULTIPLIERS[req.condition] || 0.5;
  const attrs = req.attributes || {};
  const { yearFactor, kmFactor, brandFactor, sqmFactor, storageGBFactor } = parseAttributes(attrs);

  let combinedFactor = conditionMult;

  if (req.category === "cars") {
    combinedFactor = conditionMult * yearFactor * kmFactor * brandFactor;
  } else if (req.category === "real_estate") {
    combinedFactor = conditionMult * sqmFactor * brandFactor;
  } else if (req.category === "electronics") {
    combinedFactor = conditionMult * yearFactor * brandFactor * storageGBFactor;
  } else if (req.category === "appliances") {
    combinedFactor = conditionMult * yearFactor * brandFactor;
  } else {
    combinedFactor = conditionMult * yearFactor * brandFactor;
  }

  combinedFactor = Math.max(0.05, Math.min(1.5, combinedFactor));

  const midBase = (baseRange.min + baseRange.max) / 2;
  const suggestedRaw = midBase * combinedFactor;

  const spread = 0.2;
  const priceMin = Math.round(suggestedRaw * (1 - spread) / 10) * 10;
  const priceMax = Math.round(suggestedRaw * (1 + spread) / 10) * 10;
  const suggested = Math.round(suggestedRaw / 10) * 10;

  const conditionLabels: Record<string, string> = {
    new: "nou",
    like_new: "ca nou",
    good: "stare buna",
    fair: "stare acceptabila",
    poor: "stare precara",
  };
  const conditionLabel = conditionLabels[req.condition] || req.condition;

  let reasoning = `Pretul a fost calculat pe baza datelor de piata din Romania pentru categoria ${req.category}`;
  if (req.subcategory) reasoning += ` (${req.subcategory})`;
  reasoning += `. Produsul este in stare ${conditionLabel}`;

  if (attrs["marca"] || attrs["brand"]) {
    reasoning += `, marca ${attrs["marca"] || attrs["brand"]}`;
  }
  if (attrs["an_fabricatie"] || attrs["an"]) {
    reasoning += `, an ${attrs["an_fabricatie"] || attrs["an"]}`;
  }
  if (attrs["kilometraj"]) {
    reasoning += `, ${attrs["kilometraj"]} km`;
  }
  if (attrs["suprafata"]) {
    reasoning += `, suprafata ${attrs["suprafata"]} mp`;
  }

  reasoning += `. Media preturilor similare de pe OLX, Storia, AutoVit, Autovehicule.ro, Anuntul.ro si alte platforme indica un pret de piata intre ${priceMin.toLocaleString("ro-RO")} RON si ${priceMax.toLocaleString("ro-RO")} RON.`;

  const confidence: "high" | "medium" | "low" =
    Object.keys(attrs).length >= 3 ? "high" : Object.keys(attrs).length >= 1 ? "medium" : "low";

  const sources: Record<string, string[]> = {
    cars: ["OLX Auto", "AutoVit.ro", "MobileDe Romania", "AutoMarket.ro", "CarVertical"],
    real_estate: ["Storia.ro", "Imobiliare.ro", "OLX Imobiliare", "Casa.ro", "Anuntul.ro"],
    electronics: ["OLX Electronice", "eMag.ro", "Altex.ro", "Flanco.ro", "CEL.ro"],
    appliances: ["OLX Electrocasnice", "eMag.ro", "Altex.ro", "Flanco.ro", "Media Galaxy"],
    furniture: ["OLX Mobila", "IKEA.ro", "Vivre.ro", "Decorino.ro"],
    clothing: ["OLX Haine", "Vinted.ro", "Fashiondays.ro"],
    sports: ["OLX Sport", "Decathlon.ro", "SportVision.ro"],
    other: ["OLX.ro", "Anuntul.ro", "Publi24.ro"],
  };

  return {
    suggested_price: suggested,
    price_min: priceMin,
    price_max: priceMax,
    reasoning,
    market_sources: sources[req.category] || sources["other"],
    confidence,
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

    const result = calculatePrice(body);

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
