import { supabaseServer } from "@/lib/supabase-server";
import { Product, Category } from "@/lib/supabase";
import ProductGrid from "@/components/ProductGrid";

async function getData() {
  const [{ data: products }, { data: categories }] = await Promise.all([
    supabaseServer.from("products").select("*").order("created_at", { ascending: false }),
    supabaseServer.from("categories").select("*").order("id"),
  ]);
  return {
    products: (products || []) as Product[],
    categories: (categories || []) as Category[],
  };
}

export default async function HomePage() {
  const { products, categories } = await getData();

  return (
    <div style={{ backgroundColor: "#F5F5F5", minHeight: "100vh" }}>
      <div className="page-container">

        {/* Hero Banner */}
        <div style={{
          background: "linear-gradient(135deg, #7B2FBE 0%, #4A90D9 100%)",
          borderRadius: 16,
          padding: "clamp(24px, 5vw, 56px) clamp(24px, 5vw, 56px)",
          marginBottom: 28,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -50, top: -50, width: 220, height: 220, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.07)", pointerEvents: "none" }} />
          <div style={{ position: "absolute", right: 60, bottom: -70, width: 300, height: 300, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.04)", pointerEvents: "none" }} />
          <h1 style={{ margin: "0 0 8px", fontWeight: 800, fontSize: "clamp(1.4rem, 4vw, 2.6rem)", position: "relative", zIndex: 1, lineHeight: 1.2 }}>
            Eng yaxshi narxlar 🛍️
          </h1>
          <p style={{ margin: 0, opacity: 0.88, fontSize: "clamp(0.875rem, 2vw, 1.05rem)", position: "relative", zIndex: 1, maxWidth: 500 }}>
            Mingdan ortiq mahsulot orasidan o'zingizga mosini toping. Tez yetkazib berish kafolatlangan.
          </p>
        </div>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "clamp(1rem, 2.5vw, 1.4rem)", color: "#1a1a1a" }}>
            Barcha mahsulotlar
          </h2>
          <span style={{ color: "#888", fontSize: "0.85rem", fontWeight: 500, backgroundColor: "#fff", padding: "4px 12px", borderRadius: 20, border: "1px solid #e0e0e0" }}>
            {products.length} ta
          </span>
        </div>

        <ProductGrid products={products} categories={categories} />
      </div>
    </div>
  );
}
