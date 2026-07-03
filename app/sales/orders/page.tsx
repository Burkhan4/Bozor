"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem, Product, Profile } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";
import { formatPrice } from "@/lib/format";
import { sendOrderApprovedNotification } from "@/lib/telegram";

const STATUS_CFG = {
  pending:   { text: "Kutilmoqda",    cls: "badge-pending" },
  approved:  { text: "Tasdiqlandi",   cls: "badge-approved" },
  rejected:  { text: "Rad etildi",    cls: "badge-rejected" },
  cancelled: { text: "Bekor qilindi", cls: "badge-cancelled" },
} as const;
type StatusKey = keyof typeof STATUS_CFG;

interface OrderFull extends Order {
  profile?: Pick<Profile, "full_name" | "phone"> | null;
  items: (OrderItem & { product?: Pick<Product, "id" | "name" | "image" | "price"> })[];
}

// ── Main page ──
export default function AdminOrdersPage() {
  const { user } = useAppSelector((s) => s.auth);
  const [orders,   setOrders]   = useState<OrderFull[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"all" | StatusKey>("all");
  const [expanded, setExpanded] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data: ords, error: ordErr } = await supabase
      .from("orders")
      .select("*")
      .order("created_at", { ascending: false });

    if (ordErr || !ords) { setLoading(false); return; }

    const ordersArr = ords as Order[];
    if (ordersArr.length === 0) { setOrders([]); setLoading(false); return; }

    const orderIds = ordersArr.map((o) => o.id);
    const userIds  = [...new Set(ordersArr.map((o) => o.user_id))];

    const [{ data: allItems }, { data: allProducts }, { data: allProfiles }] = await Promise.all([
      supabase.from("order_items").select("*").in("order_id", orderIds),
      supabase.from("products").select("id, name, image, price, salesman_id"),
      supabase.from("profiles").select("id, full_name, phone").in("id", userIds),
    ]);

    const itemsArr    = (allItems    || []) as (OrderItem & { order_id: number; product_id: number })[];
    const productsArr = (allProducts || []) as Product[];
    const profilesArr = (allProfiles || []) as (Profile & { id: string })[];

    const sellerProductIds = new Set(productsArr
      .filter((p) => p.salesman_id === user.id)
      .map((p) => p.id)
    );

    const sellerItems = itemsArr.filter((i) => sellerProductIds.has(Number(i.product_id)));
    const sellerOrderIds = new Set(sellerItems.map((i) => Number(i.order_id)));

    const prodMap    = new Map(productsArr.map((p) => [p.id, p]));
    const profileMap = new Map(profilesArr.map((p) => [p.id, p]));

    setOrders(ordersArr
      .filter((o) => sellerOrderIds.has(Number(o.id)))
      .map((o) => ({
        ...o,
        profile: profileMap.get(o.user_id) || null,
        items: sellerItems
          .filter((i) => String(i.order_id) === String(o.id))
          .map((i) => ({ ...i, product: prodMap.get(Number(i.product_id)) })),
      }))
    );

    setLoading(false);
  }, [user]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void load(); }, [load]);

  // ── Counts ──
  const filtered = filter === "all" ? orders : orders.filter((o) => o.status === filter);
  const counts = {
    all:       orders.length,
    pending:   orders.filter((o) => o.status === "pending").length,
    approved:  orders.filter((o) => o.status === "approved").length,
    rejected:  orders.filter((o) => o.status === "rejected").length,
    cancelled: orders.filter((o) => o.status === "cancelled").length,
  };

  return (
    <>
      <div className="admin-page-header">
        <h1>🛒 Buyurtmalar</h1>
        <button className="btn btn-secondary btn-sm" onClick={load}>🔄 Yangilash</button>
      </div>

      {/* Filter tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {(["all","pending","approved","rejected","cancelled"] as const).map((f) => {
          const lbl = { all: "Barchasi", pending: "Kutilmoqda", approved: "Tasdiqlangan", rejected: "Rad etilgan", cancelled: "Bekor" };
          return (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setFilter(f)}
            >
              {lbl[f]} ({counts[f] ?? 0})
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="empty-state">
          <div className="admin-spinner" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">📭</div>
          <p>Buyurtmalar yo&apos;q</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((order) => {
            const st     = STATUS_CFG[order.status as StatusKey] || STATUS_CFG.pending;
            const isOpen = expanded === order.id;

            return (
              <div key={order.id} className="admin-card" style={{ padding: 0, overflow: "hidden" }}>

                {/* ── Row (click to expand) ── */}
                <div
                  style={{ display: "flex", alignItems: "center", padding: "14px 20px", cursor: "pointer", gap: 12, flexWrap: "wrap" }}
                  onClick={() => setExpanded(isOpen ? null : order.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <span style={{ fontWeight: 800, fontSize: "0.95rem", minWidth: 50, color: "#7B2FBE" }}>
                    #{order.id}
                  </span>
                  <div style={{ flex: 1, minWidth: 120 }}>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>
                      {order.profile?.full_name || "Noma'lum"}
                    </div>
                    <div style={{ fontSize: "0.78rem", color: "#888" }}>
                      📞 {order.profile?.phone || "—"}
                    </div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontWeight: 800, color: "#7B2FBE" }}>
                      {formatPrice(Number(order.total_price))}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "#aaa" }}>
                      {new Date(order.created_at).toLocaleDateString("uz-UZ")}
                    </div>
                  </div>
                  <span className={`badge ${st.cls}`}>{st.text}</span>
                  <span style={{ fontSize: "0.8rem", color: "#bbb" }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {/* ── Detail (expanded) ── */}
                {isOpen && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "16px 20px" }}>
                    <div
                      style={{ display: "grid", gridTemplateColumns: "1fr", gap: 16 }}
                      className="order-det-grid"
                    >
                      {/* Items */}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 10, color: "#555" }}>
                          📦 Mahsulotlar ({order.items.length} ta)
                        </div>
                        {order.items.length === 0 ? (
                          <div style={{ fontSize: "0.82rem", color: "#aaa", padding: "8px 0" }}>
                            Mahsulotlar topilmadi
                          </div>
                        ) : (
                          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                            {order.items.map((item) => (
                              <div key={item.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", background: "#f9fafb", borderRadius: 8 }}>
                                {item.product?.image && (
                                  <img
                                    src={item.product.image} alt=""
                                    style={{ width: 38, height: 38, borderRadius: 6, objectFit: "contain", background: "#fff", flexShrink: 0 }}
                                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                                  />
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
                                    {item.product?.name || `#${item.product_id}`}
                                  </div>
                                  <div style={{ fontSize: "0.75rem", color: "#888" }}>
                                    {item.quantity} × {formatPrice(item.price)}
                                  </div>
                                </div>
                                <span style={{ fontWeight: 700, fontSize: "0.82rem", color: "#7B2FBE" }}>
                                  {formatPrice(item.price * Number(item.quantity))}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Payment check */}
                      {order.payment_check && (
                        <div>
                          <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 10, color: "#555" }}>
                            💳 To&apos;lov cheki
                          </div>
                          <a href={order.payment_check} target="_blank" rel="noopener noreferrer">
                            <img
                              src={order.payment_check} alt="Chek"
                              style={{ maxWidth: "100%", maxHeight: 200, borderRadius: 10, border: "1px solid #e5e7eb", objectFit: "contain", background: "#f9fafb" }}
                              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                            />
                          </a>
                          <div style={{ fontSize: "0.75rem", color: "#7B2FBE", marginTop: 4 }}>
                            Kattalashtirish uchun bosing ↗
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ── Action buttons ── */}
                    {order.status === "pending" && (
                      <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6", display: "flex", gap: 10 }}>
                        <button
                          className="btn btn-primary btn-sm"
                          onClick={async () => {
                            const { error } = await supabase
                              .from("orders")
                              .update({ status: "approved" })
                              .eq("id", order.id);
                            if (!error) {
                              sendOrderApprovedNotification(order.id);
                              load();
                            }
                          }}
                        >
                          ✅ Tasdiqlash
                        </button>
                        <button
                          className="btn btn-secondary btn-sm"
                          style={{ color: "#e53e3e" }}
                          onClick={async () => {
                            const { error } = await supabase
                              .from("orders")
                              .update({ status: "rejected" })
                              .eq("id", order.id);
                            if (!error) load();
                          }}
                        >
                          ❌ Rad etish
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: "0.8rem", color: "#888" }}>
        Ko&apos;rsatilmoqda: {filtered.length} / {orders.length} ta buyurtma
      </div>

      <style>{`
        @media (min-width: 768px) {
          .order-det-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  );
}
