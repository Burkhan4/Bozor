"use client";

import { useEffect, useState, useCallback } from "react";
import ProductForm from "@/components/admin/ProductForm";
import { supabase } from "@/lib/supabase";
import type { Product, Category } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";

export default function AdminProductsPage() {
  const [products,   setProducts]   = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [catFilter,  setCatFilter]  = useState<number | "">("");
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState<Product | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: prods }, { data: cats }] = await Promise.all([
      supabase.from("products").select("*").order("created_at", { ascending: false }),
      supabase.from("categories").select("*").order("name"),
    ]);
    setProducts((prods || []) as Product[]);
    setCategories((cats || []) as Category[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (id: number) => {
    if (!confirm("Mahsulotni o'chirishni tasdiqlaysizmi?")) return;
    setDeleting(id);
    await supabase.from("products").delete().eq("id", id);
    setProducts((p) => p.filter((x) => x.id !== id));
    setDeleting(null);
  };

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  const filtered = products.filter((p) =>
    (!search || p.name.toLowerCase().includes(search.toLowerCase())) &&
    (catFilter === "" || p.category_id === catFilter)
  );

  return (
    <>
      <div className="admin-page-header">
        <h1>📦 Mahsulotlar</h1>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
          ➕ Mahsulot qo'shish
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
        <input className="form-input" style={{ maxWidth: 280 }} placeholder="🔍 Qidirish..."
          value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className="form-select" style={{ maxWidth: 220 }} value={catFilter}
          onChange={(e) => setCatFilter(e.target.value === "" ? "" : Number(e.target.value))}>
          <option value="">Barcha kategoriyalar</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      <div className="admin-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">
            <div className="admin-spinner" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>Mahsulotlar topilmadi</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 64 }}>Rasm</th>
                  <th>Nomi</th>
                  <th>Kategoriya</th>
                  <th>Narx</th>
                  <th style={{ width: 110 }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((p) => (
                  <tr key={p.id}>
                    <td className="td-img">
                      <img
                        src={p.image || "https://placehold.co/48x48/f3e8ff/7B2FBE?text=?"}
                        alt={p.name}
                        onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48x48/f3e8ff/7B2FBE?text=?"; }}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{p.name}</div>
                      {p.description && (
                        <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: 280 }}>
                          {p.description}
                        </div>
                      )}
                    </td>
                    <td>
                      <span style={{ background: "#f3e8ff", color: "#7B2FBE", borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
                        {catMap.get(p.category_id) || "—"}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700, color: "#7B2FBE" }}>{formatPrice(p.price)}</td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(p); setShowForm(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm" disabled={deleting === p.id} onClick={() => handleDelete(p.id)}>
                          {deleting === p.id ? "⏳" : "🗑️"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: "0.8rem", color: "#888" }}>
        Jami: {filtered.length} ta mahsulot
      </div>

      {showForm && (
        <ProductForm
          product={editItem}
          categories={categories}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); load(); }}
        />
      )}
    </>
  );
}
