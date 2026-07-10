import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ───────────────────────────────────────────────

export interface Category {
  id: number;
  name: string;
  salesman_id?: string | null;
}

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  image: string;
  category_id: number;
  salesman_id?: string | null;
  organization?: string | null;
  created_at: string;
  date?: string | null;
}

export interface Profile {
  id: string;              // UUID — auth.users.id
  full_name: string | null;
  phone: string | null;
  telegram_chat_id: string | null;
  telegram_id: string | null;
  telegram_connected: boolean | string | null; // DB text, treat as truthy
  role: "user" | "salesman" | "admin" | string;
  organization?: string | null;
  created_at: string;
  date?: string | null;
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

// ─── Helper: filter out categories of inactive salesman ──
export async function getActiveCategories(supabaseClient: any, categories: Category[]): Promise<Category[]> {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const sellerIds = Array.from(
    new Set(categories.map((c) => c.salesman_id).filter(Boolean))
  ) as string[];

  if (sellerIds.length === 0) {
    return categories;
  }

  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("id, date")
    .in("id", sellerIds);

  const activeSellers = new Set<string>();
  (profiles || []).forEach((p: any) => {
    if (p.date && p.date > todayStr) {
      activeSellers.add(p.id);
    }
  });

  return categories.filter(
    (c) => !c.salesman_id || activeSellers.has(c.salesman_id)
  );
}
