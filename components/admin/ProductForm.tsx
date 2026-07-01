"use client";

import { useState, useRef, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import type { Product, Category } from "@/lib/supabase";

interface Props {
  product?: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductForm({ product, categories, onClose, onSaved }: Props) {
  const isEdit = !!product;

  const [name, setName]           = useState(product?.name || "");
  const [description, setDesc]    = useState(product?.description || "");
  const [price, setPrice]         = useState(product?.price?.toString() || "");
  const [imageUrl, setImageUrl]   = useState(product?.image || "");
  const [categoryId, setCatId]    = useState<number | "">(product?.category_id || "");
  const [file, setFile]           = useState<File | null>(null);
  const [preview, setPreview]     = useState(product?.image || "");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.size > 5 * 1024 * 1024) { setError("Fayl 5MB dan kichik bo'lishi kerak"); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setError("");
  };

  const uploadImage = async (): Promise<string> => {
    if (!file) return imageUrl;
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `products/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage.from("products").upload(path, file, { upsert: true });
    setUploading(false);
    if (upErr) throw new Error("Rasm yuklashda xatolik: " + upErr.message);
    const { data } = supabase.storage.from("products").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) { setError("Nomi majburiy"); return; }
    if (!price || isNaN(Number(price))) { setError("Narx to'g'ri son bo'lishi kerak"); return; }
    if (!categoryId) { setError("Kategoriya tanlang"); return; }

    setSaving(true);
    try {
      const imgUrl = await uploadImage();
      const payload = {
        name: name.trim(),
        description: description.trim(),
        price: Number(price),
        image: imgUrl,
        category_id: Number(categoryId),
      };

      if (isEdit && product) {
        const { error: e } = await supabase.from("products").update(payload).eq("id", product.id);
        if (e) throw e;
      } else {
        const { error: e } = await supabase.from("products").insert(payload);
        if (e) throw e;
      }
      onSaved();
    } catch (err: any) {
      setError(err.message || "Xatolik yuz berdi");
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2>{isEdit ? "Mahsulotni tahrirlash" : "Yangi mahsulot"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Nomi *</label>
            <input className="form-input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Mahsulot nomi" required />
          </div>

          <div className="form-group">
            <label className="form-label">Tavsif</label>
            <textarea className="form-textarea" value={description} onChange={(e) => setDesc(e.target.value)} placeholder="Mahsulot haqida..." rows={3} />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div className="form-group">
              <label className="form-label">Narx (so'm) *</label>
              <input className="form-input" type="number" min="0" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" required />
            </div>
            <div className="form-group">
              <label className="form-label">Kategoriya *</label>
              <select className="form-select" value={categoryId} onChange={(e) => setCatId(Number(e.target.value))} required>
                <option value="">Tanlang...</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Rasm</label>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

            {preview ? (
              <div style={{ position: "relative", display: "inline-block" }}>
                <img src={preview} alt="preview" style={{ width: "100%", maxHeight: 180, objectFit: "contain", borderRadius: 10, border: "1.5px solid #e5e7eb", backgroundColor: "#fafafa" }} />
                <button type="button" onClick={() => { setFile(null); setPreview(""); setImageUrl(""); }}
                  style={{ position: "absolute", top: 6, right: 6, width: 26, height: 26, borderRadius: "50%", background: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "0.9rem" }}>
                  ×
                </button>
              </div>
            ) : (
              <div className="upload-area" onClick={() => fileRef.current?.click()}>
                <div style={{ fontSize: "1.8rem", marginBottom: 6 }}>🖼️</div>
                <div style={{ fontWeight: 600, color: "#7B2FBE", fontSize: "0.875rem" }}>Rasmni yuklash</div>
                <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 4 }}>PNG, JPG, WEBP • max 5MB</div>
              </div>
            )}

            <div style={{ marginTop: 8 }}>
              <label className="form-label" style={{ marginBottom: 4 }}>Yoki URL kiriting</label>
              <input className="form-input" value={imageUrl} onChange={(e) => { setImageUrl(e.target.value); if (!file) setPreview(e.target.value); }} placeholder="https://..." />
            </div>
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={saving || uploading}>
              {saving || uploading ? "⏳ Saqlanmoqda..." : isEdit ? "💾 Saqlash" : "➕ Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
