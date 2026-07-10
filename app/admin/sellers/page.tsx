"use client";

import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";

interface SubscriptionRequest {
  id: number;
  salesman_id: string;
  plan_type: "30_days" | "6_months" | "1_year" | string;
  price: string;
  payment_check: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  profile?: {
    full_name: string | null;
    phone: string | null;
    organization: string | null;
  } | null;
}

interface SellerProfile {
  id: string;
  full_name: string | null;
  phone: string | null;
  organization: string | null;
  date: string | null;
  created_at: string;
}

export default function AdminSellersPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "active" | "inactive">("pending");
  const [loading, setLoading] = useState(true);
  
  // Data lists
  const [pendingSubs, setPendingSubs] = useState<SubscriptionRequest[]>([]);
  const [activeSellers, setActiveSellers] = useState<SellerProfile[]>([]);
  const [inactiveSellers, setInactiveSellers] = useState<SellerProfile[]>([]);
  
  // Accordion state
  const [expandedRequestId, setExpandedRequestId] = useState<number | null>(null);

  // Modal states
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    type: "approve" | "reject";
    request: SubscriptionRequest | null;
  }>({ show: false, type: "approve", request: null });

  const loadData = useCallback(async () => {
    setLoading(true);
    const todayStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Tashkent",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    // 1. Fetch pending subscriptions
    const { data: subsData, error: subsErr } = await supabase
      .from("salesman_subscriptions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: false });

    if (subsErr) console.error("Error fetching subscriptions:", subsErr);
    const pendingRequests = (subsData || []) as SubscriptionRequest[];

    // 2. Fetch profiles for pending subscriptions
    if (pendingRequests.length > 0) {
      const salesmanIds = Array.from(new Set(pendingRequests.map((r) => r.salesman_id)));
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, full_name, phone, organization")
        .in("id", salesmanIds);

      const profileMap = new Map(
        (profilesData || []).map((p) => [p.id, p])
      );

      pendingRequests.forEach((req) => {
        req.profile = profileMap.get(req.salesman_id) || null;
      });
    }
    setPendingSubs(pendingRequests);

    // 3. Fetch all sellers
    const { data: sellersData, error: sellersErr } = await supabase
      .from("profiles")
      .select("id, full_name, phone, organization, date, created_at")
      .eq("role", "salesman")
      .order("created_at", { ascending: false });

    if (sellersErr) console.error("Error fetching sellers:", sellersErr);
    const allSellers = (sellersData || []) as SellerProfile[];

    const activeList = allSellers.filter((s) => s.date && s.date > todayStr);
    const inactiveList = allSellers.filter((s) => !s.date || s.date <= todayStr);

    setActiveSellers(activeList);
    setInactiveSellers(inactiveList);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleActionClick = (type: "approve" | "reject", request: SubscriptionRequest) => {
    setConfirmModal({ show: true, type, request });
  };

  const handleConfirmAction = async () => {
    const { type, request } = confirmModal;
    if (!request) return;

    setLoading(true);
    setConfirmModal({ show: false, type: "approve", request: null });

    try {
      if (type === "approve") {
        // 1. Calculate end date
        const now = new Date();
        if (request.plan_type === "30_days") {
          now.setDate(now.getDate() + 30);
        } else if (request.plan_type === "6_months") {
          now.setMonth(now.getMonth() + 6);
        } else if (request.plan_type === "1_year") {
          now.setFullYear(now.getFullYear() + 1);
        }

        const newDateStr = new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Tashkent",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(now);

        // 2. Update profiles.date
        const { error: profileErr } = await supabase
          .from("profiles")
          .update({ date: newDateStr })
          .eq("id", request.salesman_id);
        if (profileErr) throw profileErr;

        // 3. Update products.date
        const { error: productsErr } = await supabase
          .from("products")
          .update({ date: newDateStr })
          .eq("salesman_id", request.salesman_id);
        if (productsErr) throw productsErr;

        // 4. Update status in salesman_subscriptions
        const { error: subErr } = await supabase
          .from("salesman_subscriptions")
          .update({ status: "approved" })
          .eq("id", request.id);
        if (subErr) throw subErr;
      } else {
        // Reject - update status only
        const { error: subErr } = await supabase
          .from("salesman_subscriptions")
          .update({ status: "rejected" })
          .eq("id", request.id);
        if (subErr) throw subErr;
      }

      await loadData();
    } catch (err) {
      console.error("Error performing admin action:", err);
      alert("Xatolik yuz berdi. Iltimos, qaytadan urinib ko'ring.");
      setLoading(false);
    }
  };

  const formatDateUz = (dateStr: string | null) => {
    if (!dateStr) return "mavjud emas";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`;
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="empty-state">
          <div className="admin-spinner" style={{ margin: "0 auto" }} />
          <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
        </div>
      );
    }

    if (activeTab === "pending") {
      if (pendingSubs.length === 0) {
        return (
          <div className="empty-state">
            <div className="empty-icon">📭</div>
            <p>Kutilayotgan to'lov arizalari yo'q</p>
          </div>
        );
      }

      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {pendingSubs.map((req) => {
            const isOpen = expandedRequestId === req.id;
            const isPdf = req.payment_check?.toLowerCase().endsWith(".pdf");
            const planLabels: Record<string, string> = {
              "30_days": "30 kun",
              "6_months": "6 oy",
              "1_year": "1 yil"
            };

            return (
              <div key={req.id} className="admin-card" style={{ padding: 0, overflow: "hidden" }}>
                <div
                  style={{ display: "flex", alignItems: "center", padding: "14px 20px", cursor: "pointer", gap: 12, flexWrap: "wrap" }}
                  onClick={() => setExpandedRequestId(isOpen ? null : req.id)}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "")}
                >
                  <div style={{ flex: 1, minWidth: 160 }}>
                    <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#7B2FBE", marginBottom: 2 }}>
                      🏢 {req.profile?.organization || "Tashkilot nomi yo'q"}
                    </div>
                    <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#1a1a1a" }}>
                      👤 {req.profile?.full_name || "Ism kiritilmagan"}
                    </div>
                  </div>

                  <div style={{ minWidth: 100 }}>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>Muddati</div>
                    <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>
                      📅 {planLabels[req.plan_type] || req.plan_type}
                    </div>
                  </div>

                  <div style={{ minWidth: 120 }}>
                    <div style={{ fontSize: "0.75rem", color: "#888" }}>Sana</div>
                    <div style={{ fontSize: "0.82rem", color: "#555" }}>
                      {new Date(req.created_at).toLocaleString("uz-UZ")}
                    </div>
                  </div>

                  <span className="badge badge-pending">Kutilmoqda</span>
                  <span style={{ fontSize: "0.8rem", color: "#bbb" }}>{isOpen ? "▲" : "▼"}</span>
                </div>

                {isOpen && (
                  <div style={{ borderTop: "1px solid #f3f4f6", padding: "16px 20px", backgroundColor: "#fafafa" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 20 }}>
                      
                      {/* Subscription Details */}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 10, color: "#555" }}>
                          📋 Obuna tafsilotlari
                        </div>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
                          <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", flex: "1 1 150px" }}>
                            <span style={{ fontSize: "0.72rem", color: "#888", display: "block" }}>Tarif muddati</span>
                            <span style={{ fontWeight: 700, color: "#1a1a1a" }}>{planLabels[req.plan_type] || req.plan_type}</span>
                          </div>
                          <div style={{ backgroundColor: "#fff", padding: "10px 14px", borderRadius: 8, border: "1px solid #e5e7eb", flex: "1 1 150px" }}>
                            <span style={{ fontSize: "0.72rem", color: "#888", display: "block" }}>To'lov summasi</span>
                            <span style={{ fontWeight: 700, color: "#7B2FBE" }}>{req.price}</span>
                          </div>
                        </div>
                      </div>

                      {/* Payment check receipt */}
                      <div>
                        <div style={{ fontWeight: 700, fontSize: "0.85rem", marginBottom: 10, color: "#555" }}>
                          📄 To&apos;lov cheki
                        </div>
                        {isPdf ? (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", backgroundColor: "#fff", borderRadius: 10, border: "1px solid #e5e7eb" }}>
                            <span style={{ fontSize: "1.8rem" }}>📄</span>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: "0.85rem", fontWeight: 600 }}>To'lov hujjati (PDF)</div>
                              <a href={req.payment_check} target="_blank" rel="noopener noreferrer" style={{ fontSize: "0.75rem", color: "#7B2FBE", textDecoration: "none", fontWeight: 700 }}>
                                Chekni yangi tabda ko'rish ↗
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div>
                            <a href={req.payment_check} target="_blank" rel="noopener noreferrer">
                              <img
                                src={req.payment_check}
                                alt="To'lov cheki"
                                style={{ maxWidth: "100%", maxHeight: 300, borderRadius: 10, border: "1px solid #e5e7eb", objectFit: "contain", background: "#fff" }}
                                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                              />
                            </a>
                            <div style={{ fontSize: "0.75rem", color: "#7B2FBE", marginTop: 6, fontWeight: 500 }}>
                              Kattalashtirish uchun rasm ustiga bosing ↗
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Buttons */}
                      <div style={{ display: "flex", gap: 12, borderTop: "1px solid #e5e7eb", paddingTop: 16 }}>
                        <button
                          className="btn btn-primary"
                          onClick={() => handleActionClick("approve", req)}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px" }}
                        >
                          ✅ Tasdiqlash
                        </button>
                        <button
                          className="btn btn-danger"
                          onClick={() => handleActionClick("reject", req)}
                          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "10px 16px" }}
                        >
                          ❌ Rad etish
                        </button>
                      </div>

                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      );
    }

    const sellersList = activeTab === "active" ? activeSellers : inactiveSellers;

    if (sellersList.length === 0) {
      return (
        <div className="empty-state">
          <div className="empty-icon">👥</div>
          <p>{activeTab === "active" ? "Faol sotuvchilar topilmadi" : "Faol emas sotuvchilar topilmadi"}</p>
        </div>
      );
    }

    return (
      <div className="admin-card" style={{ padding: 0 }}>
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Tashkilot</th>
                <th>Sotuvchi</th>
                <th>Telefon</th>
                <th>Amal qilish muddati</th>
              </tr>
            </thead>
            <tbody>
              {sellersList.map((seller) => (
                <tr key={seller.id}>
                  <td style={{ fontWeight: 700, color: "#7B2FBE" }}>
                    🏢 {seller.organization || "—"}
                  </td>
                  <td style={{ fontWeight: 600 }}>{seller.full_name || "—"}</td>
                  <td>{seller.phone || "—"}</td>
                  <td style={{ fontWeight: 600 }}>
                    {seller.date ? (
                      <span className={`badge ${activeTab === "active" ? "badge-approved" : "badge-rejected"}`}>
                        📅 {formatDateUz(seller.date)}
                      </span>
                    ) : (
                      <span className="badge badge-cancelled">Obuna yo'q</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="admin-page-header">
        <h1>👥 Sotuvchilar va Obunalar</h1>
        <button className="btn btn-secondary btn-sm" onClick={loadData}>🔄 Yangilash</button>
      </div>

      {/* Tabs list */}
      <div style={{ display: "flex", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
        {[
          { id: "pending", label: "Kutilayotgan", count: pendingSubs.length },
          { id: "active", label: "Faol", count: activeSellers.length },
          { id: "inactive", label: "Faol emas", count: inactiveSellers.length },
        ].map((tab) => (
          <button
            key={tab.id}
            className={`btn btn-sm ${activeTab === tab.id ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setActiveTab(tab.id as any)}
          >
            {tab.label} ({tab.count})
          </button>
        ))}
      </div>

      {renderContent()}

      {/* Confirmation Modal */}
      {confirmModal.show && confirmModal.request && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setConfirmModal({ show: false, type: "approve", request: null }); }}>
          <div className="modal" style={{ maxWidth: 440, textAlign: "center", padding: "28px 24px" }}>
            <div style={{ fontSize: "3rem", marginBottom: 12 }}>
              {confirmModal.type === "approve" ? "✅" : "⚠️"}
            </div>
            
            <h2 style={{ fontSize: "1.2rem", fontWeight: 800, color: "#1a1a1a", marginBottom: 16 }}>
              {confirmModal.type === "approve"
                ? "Haqiqatan ham ushbu to'lovni tasdiqlamoqchimisiz?"
                : "Haqiqatan ham ushbu to'lovni rad etmoqchimisiz?"}
            </h2>
            
            <p style={{ color: "#666", fontSize: "0.875rem", lineHeight: 1.5, marginBottom: 24, margin: "0 0 24px" }}>
              Sotuvchi: <strong>{confirmModal.request.profile?.full_name || "Ismsiz"}</strong> <br />
              Tashkilot: <strong>{confirmModal.request.profile?.organization || "Yo'q"}</strong> <br />
              Tarif: <strong>{confirmModal.request.plan_type === "30_days" ? "30 kun" : confirmModal.request.plan_type === "6_months" ? "6 oy" : "1 yil"}</strong>
            </p>

            <div style={{ display: "flex", gap: 12 }}>
              <button
                className="btn btn-secondary"
                style={{ flex: 1 }}
                onClick={() => setConfirmModal({ show: false, type: "approve", request: null })}
              >
                Yo'q
              </button>
              <button
                className={`btn ${confirmModal.type === "approve" ? "btn-primary" : "btn-danger"}`}
                style={{ flex: 1 }}
                onClick={handleConfirmAction}
              >
                Ha
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
