"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import { Product } from "@/lib/supabase";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("id, name, price, image, category_id, description, created_at")
      .ilike("name", `%${q}%`)
      .limit(7);
    setResults(data || []);
    setOpen(true);
    setLoading(false);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setQuery(val);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => search(val), 300);
  };

  const handleSelect = (id: number) => {
    setOpen(false);
    setQuery("");
    router.push(`/product/${id}`);
  };

  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div style={{ position: "relative", display: "flex", alignItems: "center" }}>
        <span style={{
          position: "absolute", left: 12,
          color: "#aaa", fontSize: 18, pointerEvents: "none", lineHeight: 1,
        }}>
          {loading ? "⏳" : "🔍"}
        </span>
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Mahsulot qidirish..."
          style={{
            width: "100%",
            height: 40,
            border: "1.5px solid #e5e7eb",
            borderRadius: 24,
            padding: "0 16px 0 40px",
            fontSize: "0.875rem",
            outline: "none",
            backgroundColor: "#f5f5f5",
            transition: "all 0.2s",
            fontFamily: "inherit",
          }}
          onMouseEnter={(e) => { (e.target as HTMLInputElement).style.borderColor = "#c4b5fd"; }}
          onMouseLeave={(e) => { if (document.activeElement !== e.target) (e.target as HTMLInputElement).style.borderColor = "#e5e7eb"; }}
          onFocusCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = "#7B2FBE"; (e.target as HTMLInputElement).style.backgroundColor = "#fff"; }}
          onBlurCapture={(e) => { (e.target as HTMLInputElement).style.borderColor = "#e5e7eb"; (e.target as HTMLInputElement).style.backgroundColor = "#f5f5f5"; }}
        />
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 8px)",
          left: 0,
          right: 0,
          backgroundColor: "#fff",
          borderRadius: 12,
          boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
          zIndex: 9999,
          overflow: "hidden",
          border: "1px solid #f0f0f0",
        }}>
          {results.map((p) => (
            <div
              key={p.id}
              onMouseDown={() => handleSelect(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 14px",
                cursor: "pointer",
                borderBottom: "1px solid #f9f9f9",
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f3e8ff"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.backgroundColor = "#fff"; }}
            >
              <img
                src={p.image || "https://placehold.co/44x44/f3e8ff/7B2FBE?text=?"}
                alt={p.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/44x44/f3e8ff/7B2FBE?text=?"; }}
                style={{
                  width: 44, height: 44,
                  objectFit: "contain",
                  borderRadius: 8,
                  backgroundColor: "#f8f8f8",
                  flexShrink: 0,
                  padding: 2,
                }}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  color: "#1a1a1a",
                  overflow: "hidden",
                  whiteSpace: "nowrap",
                  textOverflow: "ellipsis",
                }}>
                  {p.name}
                </div>
                <div style={{
                  fontWeight: 700,
                  fontSize: "0.8rem",
                  color: "#7B2FBE",
                  marginTop: 2,
                }}>
                  {formatPrice(p.price)}
                </div>
              </div>
              <span style={{ fontSize: "0.75rem", color: "#bbb", flexShrink: 0 }}>→</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
