"use client";

import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { useAppSelector } from "@/store/hooks";

const STATUS_CFG: Record<string, { text: string; cls: string }> = {
  pending:   { text: "Kutilmoqda",    cls: "badge-pending" },
  approved:  { text: "Tasdiqlandi",   cls: "badge-approved" },
  rejected:  { text: "Rad etildi",    cls: "badge-rejected" },
  cancelled: { text: "Bekor qilindi", cls: "badge-cancelled" },
};

export default function AdminDashboard() {
  const { user } = useAppSelector((s) => s.auth);

  const [stats, setStats]             = useState({ products: 0, categories: 0, orders: 0, pending: 0, revenue: 0 });
  const [recentOrders, setRecent]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  // Subscription check states
  const [profile, setProfile]         = useState<any>(null);
  const [latestSub, setLatestSub]     = useState<any>(null);

  // Payment form states
  const [selectedPlan, setSelectedPlan] = useState<"30_days" | "6_months" | "1_year" >("30_days");
  const [checkFile, setCheckFile]       = useState<File | null>(null);
  const [checkPreview, setCheckPreview] = useState<string>("");
  const [uploading, setUploading]       = useState(false);
  const [formError, setFormError]       = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function loadData() {
    if (!user) return;
    setLoading(true);
    setFormError("");

    // Fetch latest profile and subscription record
    const [
      { data: prof },
      { data: subs }
    ] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", user.id).single(),
      supabase.from("salesman_subscriptions")
        .select("*")
        .eq("salesman_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1)
    ]);

    setProfile(prof);
    setLatestSub(subs && subs.length > 0 ? subs[0] : null);

    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit"
    }).format(new Date());

    const active = !!(prof?.date && prof.date > todayStr);

    if (active) {
      const [
        { count: products },
        { count: categories },
        { count: ordersTotal },
        { data: orders },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }).eq("salesman_id", user.id),
        supabase.from("categories").select("*", { count: "exact", head: true }).eq("salesman_id", user.id),
        supabase.from("orders").select("*", { count: "exact", head: true }),
        supabase.from("orders")
          .select("id, total_price, status, created_at, profiles(full_name)")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);

      const all     = orders || [];
      const revenue = all.filter((o: any) => o.status === "approved").reduce((s: number, o: any) => s + o.total_price, 0);
      const pending = all.filter((o: any) => o.status === "pending").length;

      setStats({ products: products || 0, categories: categories || 0, orders: ordersTotal || 0, revenue, pending });
      setRecent(all);
    }
    setLoading(false);
  }

  useEffect(() => {
    if (user) {
      loadData();
    }
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCheckFile(file);
    if (file.type.startsWith("image/")) {
      setCheckPreview(URL.createObjectURL(file));
    } else {
      setCheckPreview("");
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    if (!checkFile || !user) {
      setFormError("Iltimos, to'lov chekini yuklang (Rasm yoki PDF formatida)");
      return;
    }

    setUploading(true);
    try {
      const ext = checkFile.name.split(".").pop();
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("payment-checks")
        .upload(path, checkFile, { upsert: true });

      if (upErr) throw new Error("Chek faylini yuklashda xatolik: " + upErr.message);

      const { data } = supabase.storage.from("payment-checks").getPublicUrl(path);
      const paymentCheckUrl = data.publicUrl;

      const priceMap = {
        "30_days": "200 000 so'm",
        "6_months": "1 100 000 so'm",
        "1_year": "2 100 000 so'm",
      };

      const { error: insertErr } = await supabase
        .from("salesman_subscriptions")
        .insert({
          salesman_id: user.id,
          plan_type: selectedPlan,
          price: priceMap[selectedPlan],
          payment_check: paymentCheckUrl,
          status: "pending",
        });

      if (insertErr) throw insertErr;

      await loadData();
    } catch (err: any) {
      setFormError(err.message || "Xatolik yuz berdi");
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="empty-state">
        <div className="admin-spinner" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
      </div>
    );
  }

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());

  const isSubActive = !!(profile?.date && profile.date > todayStr);

  if (!isSubActive) {
    if (latestSub?.status === "pending") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60vh", padding: 24 }}>
          <div style={{ backgroundColor: "#fff", borderRadius: 16, padding: "40px 32px", width: "100%", maxWidth: 500, boxShadow: "0 10px 30px rgba(0,0,0,0.05)", textAlign: "center" }}>
            <div style={{ fontSize: "3.5rem", marginBottom: 20 }}>⏳</div>
            <h2 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a1a1a", marginBottom: 12 }}>
              To&apos;lovingiz tekshirilmoqda
            </h2>
            <p style={{ color: "#666", fontSize: "0.95rem", lineHeight: 1.6, margin: "0 0 20px" }}>
              Siz yuborgan to&apos;lov cheki tekshirilmoqda. Tez orada administrator to&apos;lovni tasdiqlaydi va sizning sotuvchi sahifangiz to&apos;liq faollashadi.
            </p>
            <div style={{ padding: "12px 16px", backgroundColor: "#f3e8ff", borderRadius: 10, border: "1px solid #d8b4fe", color: "#7B2FBE", fontSize: "0.85rem", fontWeight: 600 }}>
              Tarif: {latestSub.plan_type === "30_days" ? "30 kun" : latestSub.plan_type === "6_months" ? "6 oy" : "1 yil"} • Summa: {latestSub.price}
            </div>
            <button className="btn btn-secondary" style={{ marginTop: 24, width: "100%" }} onClick={loadData}>
              🔄 Holatni yangilash
            </button>
          </div>
        </div>
      );
    }

    return (
      <div style={{ maxWidth: 800, margin: "0 auto", padding: "12px 0 32px" }}>
        <h1 style={{ fontSize: "1.6rem", fontWeight: 800, color: "#1a1a1a", marginBottom: 8 }}>Sotuvchi Obunasi</h1>
        <p style={{ color: "#555", fontSize: "0.95rem", marginBottom: 24 }}>
          Mahsulotlar sotishni boshlash yoki davom ettirish uchun obuna bo&apos;lishingiz kerak. Quyidagi tariflardan birini tanlang va to&apos;lov chekini yuklang.
        </p>

        {formError && <div className="alert-error" style={{ marginBottom: 20 }}>⚠️ {formError}</div>}

        <form onSubmit={handlePaymentSubmit}>
          {/* Tariffs Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16, marginBottom: 24 }}>
            {[
              { id: "30_days", title: "30 kun", price: "200 000 so'm" },
              { id: "6_months", title: "6 oy", price: "1 100 000 so'm" },
              { id: "1_year", title: "1 yil", price: "2 100 000 so'm" },
            ].map((p) => {
              const isSelected = selectedPlan === p.id;
              return (
                <div
                  key={p.id}
                  onClick={() => setSelectedPlan(p.id as any)}
                  style={{
                    backgroundColor: "#fff",
                    borderRadius: 12,
                    padding: "24px 20px",
                    border: isSelected ? "2.5px solid #7B2FBE" : "1.5px solid #e5e7eb",
                    cursor: "pointer",
                    textAlign: "center",
                    transition: "all 0.2s",
                    boxShadow: isSelected ? "0 4px 16px rgba(123,47,190,0.12)" : "none",
                  }}
                >
                  <h3 style={{ margin: "0 0 10px", fontSize: "1.2rem", fontWeight: 700, color: "#1a1a1a" }}>{p.title}</h3>
                  <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#7B2FBE" }}>{p.price}</div>
                </div>
              );
            })}
          </div>

          {/* Card details */}
          <div className="admin-card" style={{ marginBottom: 24, padding: "20px 24px" }}>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#666", marginBottom: 12, textTransform: "uppercase" }}>
              💳 To&apos;lov ma&apos;lumotlari
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a1a1a", letterSpacing: 1, marginBottom: 8, display: "flex", alignItems: "center", gap: 10 }}>
              <span>8600 **** **** ****</span>
            </div>
            <p style={{ margin: 0, fontSize: "0.9rem", color: "#555", lineHeight: 1.5, fontWeight: 500 }}>
              Tanlangan tarifga muvofiq summani o&apos;tkazing. <br />
              <span style={{ color: "#888", fontSize: "0.82rem" }}>Переведите сумму согласно выбранному тарифу.</span>
            </p>
          </div>

          {/* Upload receipt */}
          <div className="admin-card" style={{ padding: "24px 20px", marginBottom: 24 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label" style={{ marginBottom: 10, fontWeight: 700 }}>
                📄 To&apos;lov chekini yuklash (Rasm yoki PDF) *
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
                required
              />

              {checkFile ? (
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", backgroundColor: "#f9fafb", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "1.6rem" }}>
                      {checkFile.type.startsWith("image/") ? "🖼️" : "📄"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 600, fontSize: "0.875rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                        {checkFile.name}
                      </div>
                      <div style={{ fontSize: "0.75rem", color: "#888", marginTop: 2 }}>
                        {(checkFile.size / 1024 / 1024).toFixed(2)} MB
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => { setCheckFile(null); setCheckPreview(""); }}
                      style={{ background: "#ef4444", color: "#fff", border: "none", width: 26, height: 26, borderRadius: "50%", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      ✕
                    </button>
                  </div>

                  {checkPreview && (
                    <div style={{ display: "flex", justifyContent: "center", background: "#f9fafb", padding: 10, borderRadius: 10, border: "1px dashed #e5e7eb" }}>
                      <img src={checkPreview} alt="check preview" style={{ maxHeight: 220, objectFit: "contain", borderRadius: 8 }} />
                    </div>
                  )}
                </div>
              ) : (
                <div
                  className="upload-area"
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    border: "2px dashed #7B2FBE",
                    borderRadius: 12,
                    padding: "32px 20px",
                    textAlign: "center",
                    cursor: "pointer",
                    backgroundColor: "#faf5ff",
                    transition: "background 0.2s",
                  }}
                >
                  <div style={{ fontSize: "2rem", marginBottom: 8 }}>📁</div>
                  <div style={{ fontWeight: 700, color: "#7B2FBE", fontSize: "0.9rem" }}>Faylni tanlang</div>
                  <div style={{ fontSize: "0.78rem", color: "#888", marginTop: 4 }}>
                    Chek rasmini (JPG, PNG, WEBP) yoki PDF formatida yuklang • max 5MB
                  </div>
                </div>
              )}
            </div>
          </div>

          <div style={{ display: "flex", gap: 12 }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={uploading || !checkFile}
              style={{ flex: 1, padding: "14px 24px", fontSize: "1rem", fontWeight: 700 }}
            >
              {uploading ? "⏳ Yuborilmoqda..." : "🚀 To'lovni tasdiqlash uchun yuborish"}
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <>
      {/* Stats */}
      <div className="stats-grid">
        {[
          { icon: "📦", value: stats.products,   label: "Mahsulotlar",   href: "/sales/products" },
          { icon: "🏷️", value: stats.categories, label: "Kategoriyalar", href: "/sales/categories" },
          { icon: "🛒", value: stats.orders,     label: "Buyurtmalar",   href: "/sales/orders" },
          { icon: "⏳", value: stats.pending,    label: "Kutilayotgan",  href: "/sales/orders" },
        ].map(({ icon, value, label, href }) => (
          <Link key={label} href={href} style={{ textDecoration: "none" }}>
            <div className="stat-card" style={{ cursor: "pointer", transition: "box-shadow 0.2s" }}
              onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(123,47,190,0.12)")}
              onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}>
              <div className="stat-icon">{icon}</div>
              <div className="stat-value">{value}</div>
              <div className="stat-label">{label}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Revenue */}
      <div className="admin-card" style={{ marginBottom: 24, background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", border: "none" }}>
        <div style={{ fontSize: "0.85rem", opacity: 0.8, marginBottom: 4 }}>💰 Jami daromad (tasdiqlangan)</div>
        <div style={{ fontSize: "2rem", fontWeight: 800 }}>{formatPrice(stats.revenue)}</div>
      </div>

      {/* Recent orders */}
      <div className="admin-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>So'nggi buyurtmalar</h2>
          <Link href="/sales/orders" className="btn btn-secondary btn-sm">Barchasi →</Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="empty-state"><div className="empty-icon">📭</div><p>Buyurtmalar yo'q</p></div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Buyurtmachi</th>
                  <th>Summa</th>
                  <th>Status</th>
                  <th>Sana</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((o: any) => {
                  const st = STATUS_CFG[o.status] || STATUS_CFG.pending;
                  return (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 700 }}>#{o.id}</td>
                      <td>{(o.profiles as any)?.full_name || "—"}</td>
                      <td style={{ fontWeight: 700, color: "#7B2FBE" }}>{formatPrice(o.total_price)}</td>
                      <td><span className={`badge ${st.cls}`}>{st.text}</span></td>
                      <td style={{ color: "#888", fontSize: "0.8rem" }}>
                        {new Date(o.created_at).toLocaleDateString("uz-UZ")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
