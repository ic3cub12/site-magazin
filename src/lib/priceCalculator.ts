import { supabase } from "./supabase";
import { Category, Condition } from "./supabase";

export interface PriceRequest {
  title: string;
  description: string;
  category: Category;
  subcategory?: string;
  condition: Condition;
  attributes?: Record<string, string>;
}

export interface PriceResult {
  suggested_price: number;
  price_min: number;
  price_max: number;
  reasoning: string;
  market_sources: string[];
  confidence: "high" | "medium" | "low";
}

export async function calculateAIPrice(req: PriceRequest): Promise<PriceResult> {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token ?? supabaseKey;

  const response = await fetch(`${supabaseUrl}/functions/v1/calculate-price`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
    },
    body: JSON.stringify(req),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Price calculation failed");
  }

  const result = await response.json();
  return normalizePriceResult(result);
}

export function normalizePriceResult(result: Partial<PriceResult> | null | undefined): PriceResult {
  const safeNumber = (value: unknown, fallback = 0) => {
    const numeric = typeof value === "number" ? value : Number(value);
    return Number.isFinite(numeric) ? numeric : fallback;
  };

  const suggested = safeNumber(result?.suggested_price);
  const min = safeNumber(result?.price_min, Math.round(suggested * 0.85));
  const max = safeNumber(result?.price_max, Math.round(suggested * 1.15));

  return {
    suggested_price: suggested,
    price_min: Math.min(min, max),
    price_max: Math.max(min, max),
    reasoning: result?.reasoning || "Estimare calculata pe baza datelor disponibile.",
    market_sources: Array.isArray(result?.market_sources) ? result.market_sources : [],
    confidence: result?.confidence === "high" || result?.confidence === "medium" || result?.confidence === "low"
      ? result.confidence
      : "low",
  };
}

export function formatPrice(price?: number | null): string {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "Pret indisponibil";
  }

  return price.toLocaleString("ro-RO") + " RON";
}
