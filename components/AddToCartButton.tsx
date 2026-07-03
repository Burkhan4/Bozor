"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@mui/material";
import { ShoppingCart, FlashOn, CheckCircle } from "@mui/icons-material";
import { Product } from "@/lib/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { addToCart } from "@/store/cartSlice";

export default function AddToCartButton({ product }: { product: Product }) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const [added, setAdded] = useState(false);
  const [warning, setWarning] = useState("");
  const { user } = useAppSelector((s) => s.auth);
  const items = useAppSelector((s) => s.cart.items);
  const sellerConflict = items.length > 0 && product.salesman_id && items[0].salesman_id !== product.salesman_id;

  const showConflict = () => {
    setWarning("Savatcha faqat bitta sotuvchidan mahsulot olishi mumkin. Avval savatni tozalang.");
    window.setTimeout(() => setWarning(""), 4000);
  };

  const handleBuyNow = () => {
    if (!user) {
      router.push("/login");
      return;
    }
    if (sellerConflict) {
      showConflict();
      return;
    }
    dispatch(addToCart(product));
    router.push("/checkout");
  };

  const handleAddToCart = () => {
    if (sellerConflict) {
      showConflict();
      return;
    }
    dispatch(addToCart(product));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Sotib olish — go to checkout */}
      <Button
        fullWidth
        variant="contained"
        size="large"
        startIcon={<FlashOn />}
        onClick={handleBuyNow}
        sx={{
          py: 1.75,
          fontSize: "1rem",
          fontWeight: 700,
          borderRadius: "10px",
          background: "linear-gradient(135deg, #7B2FBE 0%, #9B5FD5 100%)",
          boxShadow: "0 4px 16px rgba(123,47,190,0.35)",
          "&:hover": {
            background: "linear-gradient(135deg, #5A1F8A 0%, #7B2FBE 100%)",
            boxShadow: "0 6px 20px rgba(123,47,190,0.45)",
          },
        }}
      >
        Sotib olish
      </Button>

      {/* Savatga qo'shish */}
      <Button
        fullWidth
        variant="outlined"
        size="large"
        startIcon={added ? <CheckCircle /> : <ShoppingCart />}
        onClick={handleAddToCart}
        sx={{
          py: 1.5,
          fontSize: "0.95rem",
          fontWeight: 600,
          borderRadius: "10px",
          borderColor: added ? "#22c55e" : "#7B2FBE",
          color: added ? "#22c55e" : "#7B2FBE",
          transition: "all 0.2s",
          "&:hover": {
            borderColor: added ? "#16a34a" : "#5A1F8A",
            backgroundColor: added ? "#f0fdf4" : "#f3e8ff",
          },
        }}
      >
        {added ? "Savatga qo'shildi ✓" : "Savatga qo'shish"}
      </Button>
      {warning && (
        <div style={{ color: "#dc2626", fontSize: "0.9rem", textAlign: "center", marginTop: 8 }}>
          {warning}
        </div>
      )}
    </div>
  );
}
