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

  return response.json();
}

export function formatPrice(price?: number | null): string {
  if (typeof price !== "number" || Number.isNaN(price)) {
    return "Pret indisponibil";
  }

  return price.toLocaleString("ro-RO", {
    style: "currency",
    currency: "RON",
    maximumFractionDigits: 0,
  });
}