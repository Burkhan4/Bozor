import { supabaseServer } from "@/lib/supabase-server";
import { Category, getActiveCategories } from "@/lib/supabase";
import NavbarClient from "./NavbarClient";

async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabaseServer
    .from("categories")
    .select("*")
    .order("id");
  if (error) {
    console.error("Kategoriyalar xatosi:", error.message);
    return [];
  }
  return getActiveCategories(supabaseServer, data || []);
}

export default async function Navbar() {
  const categories = await getCategories();
  return <NavbarClient categories={categories} />;
}
