import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ───────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category_id: number;
  created_at: string;
}

export interface Profile {
  id: string;              // UUID — auth.users.id
  full_name: string | null;
  phone: string | null;
  telegram_chat_id: string | null;
  telegram_id: string | null;
  telegram_connected: boolean | string | null; // DB text, treat as truthy
  role: "user" | "admin" | string;
  created_at: string;
}

export interface Order {
  id: number;
  user_id: string;         // UUID — auth.users.id
  total_price: number;
  status: "pending" | "approved" | "cancelled" | "rejected";
  payment_check: string | null;
  created_at: string;
}

export interface OrderItem {
  id: number;
  order_id: number;
  product_id: number;
  quantity: number;
  price: number;
}

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { products: Product | null })[];
}

// ─── Helper: check telegram_connected regardless of type ─
export function isTelegramConnected(value: Profile["telegram_connected"] | undefined): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return value === "true" || value === "1";
  return false;
}
