import Link from "next/link";
import { Chip } from "@mui/material";
import { Star } from "@mui/icons-material";
import { supabaseServer } from "@/lib/supabase-server";
import { Product, Category } from "@/lib/supabase";
import { notFound } from "next/navigation";
import AddToCartButton from "@/components/AddToCartButton";
import ProductImage from "@/components/ProductImage";
import { formatPrice as fmt } from "@/lib/format";

interface Props {
  params: Promise<{ id: string }>;
}

type SupabaseProductResult = Product & {
  organization?: string | null;
};

const getRating = (id: number) => (4.3 + ((id * 7) % 7) / 10).toFixed(1);
const getReviews = (id: number) => 50 + ((id * 13) % 450);

import { getActiveCategories } from "@/lib/supabase";

async function getData(productId: number) {
  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const [{ data: product }, { data: categories }] = await Promise.all([
    supabaseServer.from("products").select("*").eq("id", productId).single(),
    supabaseServer.from("categories").select("*"),
  ]);

  if (!product || !product.date || product.date <= todayStr) {
    return { product: null, categories: [] };
  }

  if (product.salesman_id) {
    const { data: profile } = await supabaseServer
      .from("profiles")
      .select("organization")
      .eq("id", product.salesman_id)
      .single();
    if (profile) (product as any).organization = profile.organization ?? null;
  }

  const activeCats = await getActiveCategories(supabaseServer, categories || []);

  return {
    product: product as SupabaseProductResult | null,
    categories: activeCats,
  };
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const productId = Number(id);
  if (isNaN(productId)) notFound();

  const { product, categories } = await getData(productId);
  if (!product) notFound();

  const p = product as SupabaseProductResult;
  const category = categories.find((c) => c.id === p.category_id);
  const rating = getRating(p.id);
  const reviews = getReviews(p.id);
  const stars = Math.round(Number(rating));

  return (
    <div style={{ backgroundColor: "#F5F5F5", minHeight: "100vh" }}>
      <div
        className="page-container"
        style={{ maxWidth: 1200, margin: "0 auto" }}
      >
        {/* Breadcrumb */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 24,
            fontSize: "0.85rem",
            color: "#999",
            flexWrap: "wrap",
          }}
        >
          <Link
            href="/"
            style={{
              color: "#7B2FBE",
              textDecoration: "none",
              fontWeight: 500,
            }}
          >
            Bosh sahifa
          </Link>
          <span>›</span>
          {category && (
            <>
              <Link
                href={`/category/${category.id}`}
                style={{
                  color: "#7B2FBE",
                  textDecoration: "none",
                  fontWeight: 500,
                }}
              >
                {category.name}
              </Link>
              <span>›</span>
            </>
          )}
          <span
            style={{
              overflow: "hidden",
              whiteSpace: "nowrap",
              textOverflow: "ellipsis",
              maxWidth: 220,
              color: "#555",
            }}
          >
            {p.name}
          </span>
        </div>

        {/* Main card */}
        <div
          style={{
            backgroundColor: "#fff",
            borderRadius: 16,
            padding: "32px 28px",
            boxShadow: "0 4px 24px rgba(0,0,0,0.06)",
          }}
        >
          <div
            className="product-detail-layout"
            style={{ display: "grid", gap: 40 }}
          >
            {/* ── Image (Client Component) ── */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "flex-start",
              }}
            >
              <ProductImage src={p.image} alt={p.name} />
            </div>

            {/* ── Info ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Category chip */}
              {category && (
                <Chip
                  label={category.name}
                  size="small"
                  sx={{
                    alignSelf: "flex-start",
                    backgroundColor: "#f3e8ff",
                    color: "#7B2FBE",
                    fontWeight: 600,
                    fontSize: "0.78rem",
                    border: "1px solid #d8b4fe",
                    borderRadius: "20px",
                  }}
                />
              )}

              {p.organization && (
                <div
                  style={{
                    fontSize: "0.9rem",
                    color: "#4b5563",
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e5e7eb",
                    padding: "10px 14px",
                    borderRadius: 12,
                    display: "inline-block",
                  }}
                >
                  Sotuvchi: {p.organization}
                </div>
              )}

              {/* Name */}
              <h1
                style={{
                  margin: 0,
                  fontWeight: 800,
                  fontSize: "clamp(1.3rem, 3vw, 1.9rem)",
                  color: "#1a1a1a",
                  lineHeight: 1.3,
                }}
              >
                {p.name}
              </h1>

              {/* Rating */}
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div style={{ display: "flex", gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star
                      key={s}
                      style={{
                        fontSize: 20,
                        color: s <= stars ? "#f59e0b" : "#e5e7eb",
                      }}
                    />
                  ))}
                </div>
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: "0.95rem",
                    color: "#f59e0b",
                  }}
                >
                  {rating}
                </span>
                <span style={{ color: "#aaa", fontSize: "0.85rem" }}>
                  ({reviews} ta sharh)
                </span>
              </div>

              {/* Price */}
              <p
                style={{
                  margin: 0,
                  fontWeight: 900,
                  fontSize: "clamp(1.6rem, 4vw, 2.2rem)",
                  color: "#7B2FBE",
                  letterSpacing: "-0.5px",
                }}
              >
                {fmt(p.price)}
              </p>

              {/* Description */}
              {p.description && (
                <div>
                  <p
                    style={{
                      margin: "0 0 8px",
                      fontWeight: 700,
                      fontSize: "0.9rem",
                      color: "#555",
                    }}
                  >
                    Mahsulot haqida:
                  </p>
                  <p
                    style={{
                      margin: 0,
                      color: "#555",
                      fontSize: "0.95rem",
                      lineHeight: 1.75,
                      backgroundColor: "#f9fafb",
                      padding: "14px 16px",
                      borderRadius: 10,
                      border: "1px solid #f0f0f0",
                    }}
                  >
                    {p.description}
                  </p>
                </div>
              )}

              {/* Delivery badges */}
              <div
                style={{
                  display: "flex",
                  gap: 16,
                  padding: "14px 16px",
                  backgroundColor: "#f0fdf4",
                  borderRadius: 10,
                  border: "1px solid #bbf7d0",
                  flexWrap: "wrap",
                }}
              >
                {[
                  { top: "✓ Bepul", bot: "Yetkazib berish" },
                  { top: "1-3 kun", bot: "Yetkazib berish muddati" },
                  { top: "✓ Kafolat", bot: "Sifat kafolati" },
                ].map(({ top, bot }) => (
                  <div
                    key={bot}
                    style={{ textAlign: "center", flex: "1 1 80px" }}
                  >
                    <div
                      style={{
                        fontWeight: 700,
                        color: "#16a34a",
                        fontSize: "0.875rem",
                      }}
                    >
                      {top}
                    </div>
                    <div style={{ color: "#666", fontSize: "0.75rem" }}>
                      {bot}
                    </div>
                  </div>
                ))}
              </div>

              {/* Buttons (Client Component) */}
              <AddToCartButton product={p} />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .product-detail-layout {
          grid-template-columns: 1fr;
        }
        @media (min-width: 768px) {
          .product-detail-layout {
            grid-template-columns: 1fr 1fr;
          }
        }
      `}</style>
    </div>
  );
}
