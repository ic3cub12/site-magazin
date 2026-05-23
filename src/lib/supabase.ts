import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Category =
  | "cars"
  | "real_estate"
  | "electronics"
  | "appliances"
  | "furniture"
  | "clothing"
  | "sports"
  | "other";

export type Condition = "new" | "like_new" | "good" | "fair" | "poor";

export interface Profile {
  id: string;
  full_name: string;
  avatar_url: string;
  phone: string;
  location: string;
  created_at: string;
}

export interface Listing {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: Category;
  subcategory: string;
  condition: Condition;
  asking_price: number | null;
  ai_suggested_price: number | null;
  ai_price_min: number | null;
  ai_price_max: number | null;
  ai_price_reasoning: string;
  ai_price_updated_at: string | null;
  images: string[];
  location: string;
  status: string;
  views: number;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
}

export interface Message {
  id: string;
  listing_id: string;
  sender_id: string;
  receiver_id: string;
  content: string;
  read: boolean;
  created_at: string;
}
