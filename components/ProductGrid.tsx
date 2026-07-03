"use client";

import { Skeleton } from "@mui/material";
import { Product, Category } from "@/lib/supabase";
import ProductCard from "./ProductCard";

export default function ProductGrid({
  products,
  categories = [],
  loading = false,
  emptyMessage = "Mahsulotlar topilmadi",
}: {
  products: Product[];
  categories?: Category[];
  loading?: boolean;
  emptyMessage?: string;
}) {
  // category_id string yoki number bo'lishi mumkin (DB tipiga qarab)
  const catMap = new Map(
    categories.map((c) => [String(c.id), c.name])
  );

  if (loading) {
    return (
      <div className="pg-grid">
        {Array.from({ length: 10 }).map((_, i) => (
          <div key={i} className="pg-skeleton">
            <Skeleton
              variant="rectangular"
              style={{ aspectRatio: "1/1", borderRadius: "8px 8px 0 0" }}
            />
            <div style={{ padding: "10px 12px" }}>
              <Skeleton width="40%" height={12} style={{ marginBottom: 4 }} />
              <Skeleton width="90%" height={14} />
              <Skeleton width="70%" height={14} style={{ marginTop: 2 }} />
              <Skeleton width="55%" height={18} style={{ marginTop: 4 }} />
              <Skeleton
                variant="rectangular"
                height={30}
                style={{ marginTop: 8, borderRadius: 8 }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (products.length === 0) {
    return (
      <div
        style={{ textAlign: "center", padding: "80px 0", color: "#999" }}
      >
        <p style={{ fontSize: "3rem", margin: 0 }}>🛒</p>
        <p style={{ margin: "8px 0 0", fontSize: "1rem" }}>{emptyMessage}</p>
      </div>
    );
  }

  return (
    <div className="pg-grid">
      {products.map((p) => (
        <ProductCard
          key={p.id}
          product={p}
          categoryName={catMap.get(String(p.category_id))}
        />
      ))}
    </div>
  );
}
