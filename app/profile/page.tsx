"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CircularProgress } from "@mui/material";
import { supabase } from "@/lib/supabase";
import type { Profile, Order, OrderItem, Product } from "@/lib/supabase";
import { isTelegramConnected } from "@/lib/supabase";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { logout } from "@/store/authSlice";
import { formatPrice } from "@/lib/format";

const TG_BOT = "bozor_sayt_bot";

const STATUS_LABEL: Record<string, { text: string; color: string; bg: string }> = {
  pending:   { text: "Kutilmoqda",    color: "#92400e", bg: "#fef3c7" },
  approved:  { text: "Tasdiqlandi",   color: "#065f46", bg: "#d1fae5" },
  rejected:  { text: "Rad etildi",    color: "#991b1b", bg: "#fee2e2" },
  cancelled: { text: "Bekor qilindi", color: "#991b1b", bg: "#fee2e2" },
};

interface OrderWithItems extends Order {
  items: (OrderItem & { product?: Product })[];
}

export default function ProfilePage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useAppSelector((s) => s.auth);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [orders,  setOrders]  = useState<OrderWithItems[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async (userId: string) => {
    setLoading(true);

    // profile
    const { data: prof } = await supabase
      .from("profiles").select("*").eq("id", userId).single();
    setProfile(prof as Profile | null);

    // orders — RLS bypass: supabase client da auth session bo'lgani uchun ishlaydi
    const { data: ords, error: ordErr } = await supabase
      .from("orders")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (ordErr) {
      console.error("Orders error:", ordErr.message);
      setOrders([]);
      setLoading(false);
      return;
    }

    const ordersArr = (ords || []) as Order[];

    // order_items uchun alohida query (FK yo'q bo'lgani uchun join ishlamaydi)
    if (ordersArr.length === 0) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const orderIds = ordersArr.map((o) => o.id);

    const [{ data: allItems }, { data: allProducts }] = await Promise.all([
      supabase.from("order_items").select("*").in("order_id", orderIds),
      supabase.from("products").select("id, name, image, price"),
    ]);

    const itemsArr   = (allItems   || []) as (OrderItem & { order_id: number })[];
    const productsArr = (allProducts || []) as Product[];
    const prodMap    = new Map(productsArr.map((p) => [p.id, p]));

    const merged: OrderWithItems[] = ordersArr.map((o) => ({
      ...o,
      items: itemsArr
        .filter((i) => String(i.order_id) === String(o.id))
        .map((i) => ({ ...i, product: prodMap.get(Number(i.product_id)) })),
    }));

    setOrders(merged);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading && !user) { router.replace("/login"); return; }
    if (user) fetchData(user.id);
  }, [user, authLoading, fetchData, router]);

  // Telegram ga o'tgandan keyin qayta tekshirish
  useEffect(() => {
    const onFocus = () => { if (user) fetchData(user.id); };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user, fetchData]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(logout());
    router.push("/");
  };

  if (authLoading || loading) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#7B2FBE" }} />
      </div>
    );
  }

  if (!user) return null;

  const displayName = profile?.full_name || user.full_name || user.email?.split("@")[0] || "Foydalanuvchi";
  const initials    = displayName.split(" ").map((w: string) => w[0]).join("").toUpperCase().slice(0, 2);
  const tgConnected = isTelegramConnected(profile?.telegram_connected);

  return (
    <div style={{ backgroundColor: "#F5F5F5", minHeight: "100vh" }}>
      <div className="page-container">

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28, flexWrap: "wrap", gap: 12 }}>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: "clamp(1.3rem,3vw,1.7rem)", color: "#1a1a1a" }}>Profil</h1>
          <button onClick={handleLogout}
            style={{ padding: "9px 20px", backgroundColor: "#fff", border: "1.5px solid #e5e7eb", borderRadius: 10, fontWeight: 600, fontSize: "0.875rem", cursor: "pointer", color: "#ef4444", fontFamily: "inherit" }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fef2f2"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#fff"; }}>
            🚪 Chiqish
          </button>
        </div>

        <div style={{ display: "grid", gap: 20 }} className="profile-layout">

          {/* ── Left ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

            {/* User info */}
            <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
                <div style={{ width: 64, height: 64, borderRadius: "50%", background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: "1.4rem", flexShrink: 0 }}>
                  {initials}
                </div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: "1.1rem", color: "#1a1a1a" }}>{displayName}</div>
                  <div style={{ fontSize: "0.85rem", color: "#888", marginTop: 2 }}>{user.email}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { label: "To'liq ism",        value: profile?.full_name || "—" },
                  { label: "Email",             value: user.email || "—" },
                  { label: "Telefon",           value: profile?.phone || "—" },
                  { label: "Ro'yxatdan o'tgan", value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString("uz-UZ") : "—" },
                ].map(({ label, value }) => (
                  <div key={label} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", backgroundColor: "#f9fafb", borderRadius: 8 }}>
                    <span style={{ fontSize: "0.85rem", color: "#666", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: "0.9rem", color: "#1a1a1a", fontWeight: 600 }}>{value}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Telegram */}
            <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "20px 24px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
                <span style={{ fontSize: "1.4rem" }}>✈️</span>
                <span style={{ fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>Telegram</span>
              </div>
              {tgConnected ? (
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", backgroundColor: "#d1fae5", borderRadius: 12, border: "1px solid #a7f3d0" }}>
                  <span style={{ fontSize: "1.5rem" }}>✅</span>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#065f46" }}>Telegram ulangan</div>
                    {profile?.telegram_id && <div style={{ fontSize: "0.8rem", color: "#059669", marginTop: 2 }}>ID: {profile.telegram_id}</div>}
                  </div>
                </div>
              ) : (
                <div>
                  <p style={{ margin: "0 0 12px", fontSize: "0.875rem", color: "#666", lineHeight: 1.6 }}>
                    Telegram botni ulab buyurtmalaringiz haqida bildirishnomalar oling.
                  </p>
                  <div style={{ backgroundColor: "#fffbeb", border: "1px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 14, display: "flex", gap: 8 }}>
                    <span>⚠️</span>
                    <p style={{ margin: 0, fontSize: "0.82rem", color: "#92400e" }}>Buyurtma berish uchun Telegram ulash majburiy</p>
                  </div>
                  <button onClick={() => window.open(`https://t.me/${TG_BOT}?start=${user.id}`, "_blank", "noopener,noreferrer")}
                    style={{ width: "100%", padding: "13px 20px", background: "linear-gradient(135deg,#0088CC,#0099EE)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                    ✈️ Telegram botni ulash
                  </button>
                  <p style={{ margin: "8px 0 0", fontSize: "0.75rem", color: "#aaa", textAlign: "center" }}>Botga o'tib /start bosing</p>
                </div>
              )}
            </div>
          </div>

          {/* ── Right: Orders ── */}
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: 24, boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 20px", fontWeight: 700, fontSize: "1.05rem", color: "#1a1a1a" }}>
              Buyurtmalar tarixi
              {orders.length > 0 && (
                <span style={{ marginLeft: 8, backgroundColor: "#f3e8ff", color: "#7B2FBE", borderRadius: 20, padding: "2px 10px", fontSize: "0.8rem", fontWeight: 700 }}>
                  {orders.length}
                </span>
              )}
            </h2>

            {orders.length === 0 ? (
              <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
                <p style={{ fontSize: "2.5rem", margin: "0 0 10px" }}>📦</p>
                <p style={{ margin: 0, fontSize: "0.95rem" }}>Hozircha buyurtmalar yo'q</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {orders.map((order) => {
                  const st = STATUS_LABEL[order.status] || STATUS_LABEL.pending;
                  return (
                    <div key={order.id} style={{ border: "1.5px solid #f3f4f6", borderRadius: 12, overflow: "hidden" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", backgroundColor: "#fafafa", flexWrap: "wrap", gap: 8 }}>
                        <div>
                          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1a1a1a" }}>Buyurtma #{order.id}</span>
                          <span style={{ marginLeft: 10, fontSize: "0.8rem", color: "#888" }}>
                            {new Date(order.created_at).toLocaleDateString("uz-UZ")}
                          </span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "#7B2FBE" }}>{formatPrice(Number(order.total_price))}</span>
                          <span style={{ backgroundColor: st.bg, color: st.color, borderRadius: 20, padding: "3px 10px", fontSize: "0.78rem", fontWeight: 700 }}>
                            {st.text}
                          </span>
                        </div>
                      </div>
                      <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                        {order.items?.length > 0 ? order.items.map((item) => (
                          <div key={item.id} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.85rem", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "#555", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis", maxWidth: "60%" }}>
                              {item.product?.name || `Mahsulot #${item.product_id}`}
                            </span>
                            <span style={{ color: "#888", flexShrink: 0 }}>
                              {item.quantity} × {formatPrice(item.price)}
                            </span>
                          </div>
                        )) : (
                          <div style={{ fontSize: "0.82rem", color: "#aaa" }}>Mahsulotlar yo'q</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <style>{`
        .profile-layout { grid-template-columns: 1fr; }
        @media (min-width: 900px) { .profile-layout { grid-template-columns: 340px 1fr; } }
      `}</style>
    </div>
  );
}
