"use client";

import { useEffect, useState, useCallback } from "react";
import CategoryForm from "@/components/admin/CategoryForm";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/supabase";

interface CategoryWithCount extends Category { product_count: number; }

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithCount[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [editItem,   setEditItem]   = useState<Category | null>(null);
  const [deleting,   setDeleting]   = useState<number | null>(null);
  const [error,      setError]      = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: cats }, { data: prods }] = await Promise.all([
      supabase.from("categories").select("*").order("name"),
      supabase.from("products").select("category_id"),
    ]);
    const countMap = new Map<number, number>();
    (prods || []).forEach((p: any) => countMap.set(p.category_id, (countMap.get(p.category_id) || 0) + 1));
    setCategories((cats || []).map((c: any) => ({ ...c, product_count: countMap.get(c.id) || 0 })));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (cat: CategoryWithCount) => {
    if (cat.product_count > 0) {
      setError(`"${cat.name}" kategoriyasida ${cat.product_count} ta mahsulot bor. Avval mahsulotlarni o'chiring.`);
      return;
    }
    if (!confirm(`"${cat.name}" ni o'chirishni tasdiqlaysizmi?`)) return;
    setError("");
    setDeleting(cat.id);
    await supabase.from("categories").delete().eq("id", cat.id);
    setCategories((prev) => prev.filter((c) => c.id !== cat.id));
    setDeleting(null);
  };

  return (
    <>
      <div className="admin-page-header">
        <h1>🏷️ Kategoriyalar</h1>
        <button className="btn btn-primary" onClick={() => { setEditItem(null); setShowForm(true); }}>
          ➕ Kategoriya qo'shish
        </button>
      </div>

      {error && (
        <div className="alert-error">
          ⚠️ {error}
          <button onClick={() => setError("")} style={{ marginLeft: 10, background: "none", border: "none", cursor: "pointer", fontWeight: 700, color: "#dc2626", fontFamily: "inherit" }}>✕</button>
        </div>
      )}

      <div className="admin-card" style={{ padding: 0 }}>
        {loading ? (
          <div className="empty-state">
            <div className="admin-spinner" style={{ margin: "0 auto" }} />
            <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
          </div>
        ) : categories.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>Kategoriyalar yo'q</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: 50 }}>#</th>
                  <th>Nomi</th>
                  <th>Mahsulotlar</th>
                  <th style={{ width: 110 }}>Amallar</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((cat, i) => (
                  <tr key={cat.id}>
                    <td style={{ color: "#888", fontWeight: 600 }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{cat.name}</td>
                    <td>
                      <span style={{ background: cat.product_count > 0 ? "#f3e8ff" : "#f3f4f6", color: cat.product_count > 0 ? "#7B2FBE" : "#888", borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 600 }}>
                        {cat.product_count} ta
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6 }}>
                        <button className="btn btn-secondary btn-sm" onClick={() => { setEditItem(cat); setShowForm(true); }}>✏️</button>
                        <button className="btn btn-danger btn-sm"
                          disabled={deleting === cat.id || cat.product_count > 0}
                          title={cat.product_count > 0 ? "Avval mahsulotlarni o'chiring" : "O'chirish"}
                          onClick={() => handleDelete(cat)}>
                          {deleting === cat.id ? "⏳" : "🗑️"}
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

      <div style={{ marginTop: 12, fontSize: "0.8rem", color: "#888" }}>Jami: {categories.length} ta kategoriya</div>

      {showForm && (
        <CategoryForm
          category={editItem}
          onClose={() => { setShowForm(false); setEditItem(null); }}
          onSaved={() => { setShowForm(false); setEditItem(null); load(); }}
        />
      )}
    </>
  );
}
