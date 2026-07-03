"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import type { Category } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";

interface Props {
  category?: Category | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function CategoryForm({ category, onClose, onSaved }: Props) {
  const { user } = useAppSelector((s) => s.auth);
  const isEdit = !!category;
  const [name, setName] = useState(category?.name || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!name.trim()) {
      setError("Nom majburiy");
      return;
    }

    setSaving(true);

    if (isEdit && category) {
      const { error: e } = await supabase
        .from("categories")
        .update({ name: name.trim() })
        .eq("id", category.id)
        .eq("salesman_id", user?.id ?? "");

      if (e) {
        setError(e.message);
        setSaving(false);
        return;
      }
    } else {
      const { data, error: e } = await supabase
        .from("categories")
        .insert({
          name: name.trim(),
          salesman_id: user?.id ?? null,
        })
        .select();

      console.log("DATA:", data);
      console.log("ERROR:", e);

      if (e) {
        setError(e.message);
        setSaving(false);
        return;
      }
    }

    onSaved();
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal" style={{ maxWidth: 400 }}>
        <div className="modal-header">
          <h2>{isEdit ? "Kategoriyani tahrirlash" : "Yangi kategoriya"}</h2>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Kategoriya nomi *</label>
            <input
              className="form-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Masalan: Elektronika"
              required
              autoFocus
            />
          </div>

          <div className="form-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Bekor</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? "⏳ Saqlanmoqda..." : isEdit ? "💾 Saqlash" : "➕ Qo'shish"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
