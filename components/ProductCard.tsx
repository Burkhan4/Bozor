"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button, IconButton } from "@mui/material";
import { FavoriteBorder, Favorite, ShoppingCart, Star } from "@mui/icons-material";
import { Product } from "@/lib/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToCart } from "@/store/cartSlice";
import { toggleWishlist } from "@/store/wishlistSlice";
import { formatPrice } from "@/lib/format";

// Deterministik fake rating (id ga asoslangan, har safar bir xil)
const getRating = (id: number) => (4.3 + ((id * 7) % 7) / 10).toFixed(1);
const getReviews = (id: number) => 50 + ((id * 13) % 450);

export default function ProductCard({
  product,
  categoryName,
}: {
  product: Product;
  categoryName?: string;
}) {
  const [hovered, setHovered] = useState(false);
  const [warning, setWarning] = useState("");
  const router = useRouter();
  const dispatch = useAppDispatch();
  const items = useAppSelector((s) => s.cart.items);
  const isWishlisted = useAppSelector((s) =>
    s.wishlist.items.some((i) => i.id === product.id)
  );
  const sellerConflict = items.length > 0 && product.salesman_id && items[0].salesman_id !== product.salesman_id;

  const showConflict = () => {
    setWarning("Savatcha faqat bitta sotuvchidan mahsulot olishi mumkin. Avval savatni tozalang.");
    window.setTimeout(() => setWarning(""), 4000);
  };

  const handleBuy = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sellerConflict) {
      showConflict();
      return;
    }
    dispatch(addToCart(product));
    router.push("/checkout");
  };

  const handleAddCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (sellerConflict) {
      showConflict();
      return;
    }
    dispatch(addToCart(product));
  };

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(toggleWishlist(product));
  };

  const rating = getRating(product.id);
  const reviews = getReviews(product.id);

  return (
    <div
      onClick={() => router.push(`/product/${product.id}`)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        position: "relative",
        cursor: "pointer",
        borderRadius: 12,
        border: hovered ? "1.5px solid #d8b4fe" : "1.5px solid #eee",
        backgroundColor: "#fff",
        overflow: "hidden",
        transform: hovered ? "translateY(-4px)" : "translateY(0)",
        boxShadow: hovered
          ? "0 12px 32px rgba(123,47,190,0.15)"
          : "0 1px 4px rgba(0,0,0,0.05)",
        transition: "all 0.22s ease",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      {/* ── Image ── */}
      <div style={{
        position: "relative",
        aspectRatio: "1/1",
        backgroundColor: "#f8f8f8",
        overflow: "hidden",
      }}>
        <img
          src={product.image || "https://placehold.co/400x400/f3e8ff/7B2FBE?text=Rasm"}
          alt={product.name}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src =
              "https://placehold.co/400x400/f3e8ff/7B2FBE?text=Rasm";
          }}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "contain",
            padding: 8,
            transform: hovered ? "scale(1.07)" : "scale(1)",
            transition: "transform 0.35s ease",
          }}
        />

        {/* Category badge */}
        {categoryName && (
          <div style={{
            position: "absolute",
            top: 8, left: 8,
            backgroundColor: "rgba(123,47,190,0.1)",
            border: "1px solid rgba(123,47,190,0.2)",
            color: "#7B2FBE",
            borderRadius: 20,
            padding: "2px 8px",
            fontSize: "0.63rem",
            fontWeight: 700,
            pointerEvents: "none",
          }}>
            {categoryName}
          </div>
        )}

        {/* Action buttons (hover) */}
        <div style={{
          position: "absolute",
          top: 8, right: 8,
          display: "flex",
          flexDirection: "column",
          gap: 4,
          opacity: hovered ? 1 : 0,
          transform: hovered ? "translateX(0)" : "translateX(10px)",
          transition: "all 0.2s ease",
          pointerEvents: hovered ? "auto" : "none",
        }}>
          <IconButton
            size="small"
            onClick={handleWishlist}
            aria-label="Sevimlilarga"
            style={{
              backgroundColor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
              width: 32, height: 32,
            }}
          >
            {isWishlisted
              ? <Favorite style={{ fontSize: 16, color: "#e91e63" }} />
              : <FavoriteBorder style={{ fontSize: 16, color: "#888" }} />}
          </IconButton>
          <IconButton
            size="small"
            onClick={handleAddCart}
            aria-label="Savatga"
            style={{
              backgroundColor: "#fff",
              boxShadow: "0 2px 8px rgba(0,0,0,0.14)",
              width: 32, height: 32,
            }}
          >
            <ShoppingCart style={{ fontSize: 16, color: "#7B2FBE" }} />
          </IconButton>
        </div>
      </div>

      {/* ── Info ── */}
      <div style={{
        padding: "8px 10px 12px",
        display: "flex",
        flexDirection: "column",
        flex: 1,
        gap: 4,
      }}>
        {/* Rating */}
        <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
          <Star style={{ fontSize: 13, color: "#f59e0b" }} />
          <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#f59e0b" }}>{rating}</span>
          <span style={{ fontSize: "0.68rem", color: "#ccc" }}>({reviews})</span>
        </div>

        {/* Name */}
        <p style={{
          margin: 0,
          fontWeight: 500,
          color: "#1a1a1a",
          fontSize: "clamp(0.76rem, 2vw, 0.875rem)",
          lineHeight: 1.45,
          overflow: "hidden",
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          flex: 1,
          minHeight: "2.5em",
        }}>
          {product.name}
        </p>

        {/* Price */}
        <p style={{
          margin: "4px 0 0",
          fontWeight: 800,
          color: "#7B2FBE",
          fontSize: "clamp(0.88rem, 2.5vw, 1.05rem)",
          letterSpacing: "-0.3px",
        }}>
          {formatPrice(product.price)}
        </p>

        {/* Buy button */}
        <Button
          fullWidth
          variant="contained"
          size="small"
          onClick={handleBuy}
          sx={{
            mt: "6px",
            py: 0.75,
            fontSize: "0.75rem",
            fontWeight: 700,
            borderRadius: "8px",
            background: "linear-gradient(135deg, #7B2FBE 0%, #9B5FD5 100%)",
            boxShadow: "0 2px 8px rgba(123,47,190,0.3)",
            "&:hover": {
              background: "linear-gradient(135deg, #5A1F8A 0%, #7B2FBE 100%)",
              boxShadow: "0 4px 12px rgba(123,47,190,0.45)",
            },
          }}
        >
          Sotib olish
        </Button>
        {warning && (
          <div style={{ marginTop: 8, fontSize: "0.78rem", color: "#dc2626", fontWeight: 600 }}>
            {warning}
          </div>
        )}
      </div>
    </div>
  );
}
