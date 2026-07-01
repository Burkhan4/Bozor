"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import type { Order, OrderItem, Product, Profile } from "@/lib/supabase";
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

// ── Delete confirm modal ──
interface DeleteModalProps {
  orderId: number;
  deleting: boolean;
  deleteError: string;
  onCancel: () => void;
  onConfirm: () => void;
}

function DeleteConfirmModal({ orderId, deleting, deleteError, onCancel, onConfirm }: DeleteModalProps) {
  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 1000, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div style={{
        background: "#fff", borderRadius: 14, padding: "28px 28px 24px",
        width: "100%", maxWidth: 400,
        boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div style={{
            width: 44, height: 44, borderRadius: "50%",
            background: "#fee2e2",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.3rem", flexShrink: 0,
          }}>
            🗑️
          </div>
          <div>
            <div style={{ fontWeight: 800, fontSize: "1rem", color: "#1a1a1a" }}>
              Buyurtmani o'chirish
            </div>
            <div style={{ fontSize: "0.8rem", color: "#888", marginTop: 2 }}>
              Buyurtma #{orderId}
            </div>
          </div>
        </div>

        {/* Body */}
        <p style={{ margin: "0 0 8px", fontSize: "0.9rem", color: "#374151", lineHeight: 1.6 }}>
          Haqiqatan ham ushbu buyurtmani o'chirmoqchimisiz?
        </p>
        <p style={{ margin: "0 0 20px", fontSize: "0.82rem", color: "#ef4444", fontWeight: 600 }}>
          ⚠️ Bu amalni ortga qaytarib bo'lmaydi.
        </p>

        {/* Error */}
        {deleteError && (
          <div style={{
            background: "#fef2f2", border: "1px solid #fecaca",
            borderRadius: 8, padding: "9px 12px", marginBottom: 14,
            fontSize: "0.82rem", color: "#dc2626",
          }}>
            {deleteError}
          </div>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={onCancel}
            disabled={deleting}
            style={{
              flex: 1, padding: "10px", borderRadius: 8,
              border: "1.5px solid #e5e7eb", background: "#fff",
              fontWeight: 600, fontSize: "0.875rem",
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "inherit", color: "#374151",
              opacity: deleting ? 0.6 : 1,
            }}
          >
            Bekor qilish
          </button>
          <button
            onClick={onConfirm}
            disabled={deleting}
            style={{
              flex: 1, padding: "10px", borderRadius: 8,
              border: "none",
              background: deleting ? "#fca5a5" : "linear-gradient(135deg,#ef4444,#dc2626)",
              color: "#fff", fontWeight: 700, fontSize: "0.875rem",
              cursor: deleting ? "not-allowed" : "pointer",
              fontFamily: "inherit",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
            }}
          >
            {deleting ? "⏳ O'chirilmoqda..." : "🗑️ O'chirish"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──
export default function AdminOrdersPage() {
  const [orders,   setOrders]   = useState<OrderFull[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [filter,   setFilter]   = useState<"all" | StatusKey>("all");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updating, setUpdating] = useState<number | null>(null);

  // Delete state
  const [deleteTarget,  setDeleteTarget]  = useState<number | null>(null); // modal uchun orderId
  const [deleting,      setDeleting]      = useState(false);
  const [deleteError,   setDeleteError]   = useState("");

  const load = useCallback(async () => {
    setLoading(true);

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
      supabase.from("products").select("id, name, image, price"),
      supabase.from("profiles").select("id, full_name, phone").in("id", userIds),
    ]);

    const itemsArr    = (allItems    || []) as (OrderItem & { order_id: number; product_id: number })[];
    const productsArr = (allProducts || []) as Product[];
    const profilesArr = (allProfiles || []) as (Profile & { id: string })[];

    const prodMap    = new Map(productsArr.map((p) => [p.id, p]));
    const profileMap = new Map(profilesArr.map((p) => [p.id, p]));

    setOrders(ordersArr.map((o) => ({
      ...o,
      profile: profileMap.get(o.user_id) || null,
      items: itemsArr
        .filter((i) => String(i.order_id) === String(o.id))
        .map((i) => ({ ...i, product: prodMap.get(Number(i.product_id)) })),
    })));

    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Update status (approve / reject) ──
  const updateStatus = async (orderId: number, status: "approved" | "rejected") => {
    setUpdating(orderId);

    const { error } = await supabase
      .from("orders").update({ status }).eq("id", orderId);

    if (error) {
      console.error("Status yangilashda xatolik:", error.message);
      setUpdating(null);
      return;
    }

    setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, status } : o));

    if (status === "approved") {
      sendOrderApprovedNotification(orderId);
    }

    setUpdating(null);
  };

  // ── Delete order ──
  const handleDeleteClick = (orderId: number) => {
    setDeleteTarget(orderId);
    setDeleteError("");
  };

  const handleDeleteCancel = () => {
    if (deleting) return;
    setDeleteTarget(null);
    setDeleteError("");
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError("");

    try {
      // 1. order_items ni o'chirish
      const { error: itemsErr } = await supabase
        .from("order_items")
        .delete()
        .eq("order_id", deleteTarget);

      if (itemsErr) throw new Error("order_items o'chirishda xatolik: " + itemsErr.message);

      // 2. order ni o'chirish
      const { error: orderErr } = await supabase
        .from("orders")
        .delete()
        .eq("id", deleteTarget);

      if (orderErr) throw new Error("orders o'chirishda xatolik: " + orderErr.message);

      // 3. UI yangilash
      setOrders((prev) => prev.filter((o) => o.id !== deleteTarget));
      if (expanded === deleteTarget) setExpanded(null);
      setDeleteTarget(null);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Noma'lum xatolik";
      console.error("[DeleteOrder]", msg);
      setDeleteError("Buyurtmani o'chirishda xatolik yuz berdi");
    } finally {
      setDeleting(false);
    }
  };

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
      {/* ── Delete confirm modal ── */}
      {deleteTarget !== null && (
        <DeleteConfirmModal
          orderId={deleteTarget}
          deleting={deleting}
          deleteError={deleteError}
          onCancel={handleDeleteCancel}
          onConfirm={handleDeleteConfirm}
        />
      )}

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
          <p>Buyurtmalar yo'q</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((order) => {
            const st     = STATUS_CFG[order.status as StatusKey] || STATUS_CFG.pending;
            const isOpen = expanded === order.id;
            const isUpd  = updating === order.id;

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
                            💳 To'lov cheki
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
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #f3f4f6" }}>
                      {order.status === "pending" ? (
                        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-success"
                            disabled={isUpd}
                            onClick={() => updateStatus(order.id, "approved")}
                            style={{ flex: 1, minWidth: 120 }}
                          >
                            {isUpd ? "⏳" : "✅"} Tasdiqlash
                          </button>
                          <button
                            className="btn btn-danger"
                            disabled={isUpd}
                            onClick={() => updateStatus(order.id, "rejected")}
                            style={{ flex: 1, minWidth: 120 }}
                          >
                            {isUpd ? "⏳" : "❌"} Rad etish
                          </button>
                          {/* Delete button */}
                          <button
                            className="btn btn-danger"
                            disabled={isUpd}
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(order.id); }}
                            style={{ minWidth: 44, flexShrink: 0 }}
                            title="Buyurtmani o'chirish"
                          >
                            🗑️
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                          <div style={{ fontSize: "0.82rem", color: "#aaa" }}>
                            Buyurtma {st.text.toLowerCase()}
                          </div>
                          {/* Delete button — har qanday statusda ham o'chirsa bo'ladi */}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(order.id); }}
                            title="Buyurtmani o'chirish"
                          >
                            🗑️ O'chirish
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div style={{ marginTop: 14, fontSize: "0.8rem", color: "#888" }}>
        Ko'rsatilmoqda: {filtered.length} / {orders.length} ta buyurtma
      </div>

      <style>{`
        @media (min-width: 768px) {
          .order-det-grid { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </>
  );
}
