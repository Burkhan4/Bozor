// Faqat Server Components uchun — RLS bypass
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// Service role key bo'lsa RLS bypass, aks holda anon key
const key =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

export const supabaseServer = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
});
