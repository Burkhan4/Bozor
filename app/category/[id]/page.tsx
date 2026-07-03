import { supabaseServer } from "@/lib/supabase-server";
import { Product, Category } from "@/lib/supabase";
import ProductGrid from "@/components/ProductGrid";
import { notFound } from "next/navigation";

interface Props { params: Promise<{ id: string }> }

async function getData(categoryId: number) {
  const [{ data: category }, { data: products }, { data: allCats }] = await Promise.all([
    supabaseServer.from("categories").select("*").eq("id", categoryId).single(),
    supabaseServer.from("products").select("*").eq("category_id", categoryId).order("created_at", { ascending: false }),
    supabaseServer.from("categories").select("*"),
  ]);

  const prods = (products || []) as Product[];
  const sellerIds = Array.from(new Set(prods.map((p) => p.salesman_id).filter(Boolean))) as string[];
  let profilesMap = new Map<string, string | null>();
  if (sellerIds.length > 0) {
    const { data: profiles } = await supabaseServer.from("profiles").select("id, organization").in("id", sellerIds);
    (profiles || []).forEach((pr: any) => profilesMap.set(pr.id, pr.organization ?? null));
  }

  return {
    category,
    products: prods.map((product) => ({ ...product, organization: product.salesman_id ? profilesMap.get(product.salesman_id) ?? null : null })) as Product[],
    allCats: (allCats || []) as Category[],
  };
}

export default async function CategoryPage({ params }: Props) {
  const { id } = await params;
  const categoryId = Number(id);
  if (isNaN(categoryId)) notFound();

  const { category, products, allCats } = await getData(categoryId);
  if (!category) notFound();

  const cat = category as Category;

  return (
    <div style={{ backgroundColor: "#F5F5F5", minHeight: "100vh" }}>
      <div className="page-container">

        {/* Header */}
        <div style={{
          background: "linear-gradient(135deg, #7B2FBE 0%, #9B5FD5 100%)",
          borderRadius: 16,
          padding: "clamp(24px, 4vw, 44px) clamp(24px, 5vw, 56px)",
          marginBottom: 28,
          color: "#fff",
          position: "relative",
          overflow: "hidden",
        }}>
          <div style={{ position: "absolute", right: -40, top: -40, width: 180, height: 180, borderRadius: "50%", backgroundColor: "rgba(255,255,255,0.08)", pointerEvents: "none" }} />
          <h1 style={{ margin: "0 0 6px", fontWeight: 800, fontSize: "clamp(1.3rem, 3.5vw, 2.1rem)", position: "relative", zIndex: 1 }}>
            {cat.name}
          </h1>
          <p style={{ margin: 0, opacity: 0.82, fontSize: "0.95rem", position: "relative", zIndex: 1 }}>
            {products.length} ta mahsulot topildi
          </p>
        </div>

        {/* Section header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontWeight: 700, fontSize: "clamp(1rem, 2.5vw, 1.3rem)", color: "#1a1a1a" }}>
            {cat.name} mahsulotlari
          </h2>
          <span style={{ color: "#888", fontSize: "0.85rem", backgroundColor: "#fff", padding: "4px 12px", borderRadius: 20, border: "1px solid #e0e0e0" }}>
            {products.length} ta
          </span>
        </div>

        <ProductGrid products={products} categories={allCats} emptyMessage="Bu kategoriyada hozircha mahsulotlar yo'q" />
      </div>
    </div>
  );
}
