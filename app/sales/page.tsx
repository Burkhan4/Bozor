"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import Link from "next/link";

const STATUS_CFG: Record<string, { text: string; cls: string }> = {
  pending:   { text: "Kutilmoqda",    cls: "badge-pending" },
  approved:  { text: "Tasdiqlandi",   cls: "badge-approved" },
  rejected:  { text: "Rad etildi",    cls: "badge-rejected" },
  cancelled: { text: "Bekor qilindi", cls: "badge-cancelled" },
};

export default function AdminDashboard() {
  const [stats, setStats]             = useState({ products: 0, categories: 0, orders: 0, pending: 0, revenue: 0 });
  const [recentOrders, setRecent]     = useState<any[]>([]);
  const [loading, setLoading]         = useState(true);

  useEffect(() => {
    async function load() {
      const [
        { count: products },
        { count: categories },
        { count: ordersTotal },
        { data: orders },
      ] = await Promise.all([
        supabase.from("products").select("*", { count: "exact", head: true }),
        supabase.from("categories").select("*", { count: "exact", head: true }),
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
      setLoading(false);
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="empty-state">
        <div className="admin-spinner" style={{ margin: "0 auto" }} />
        <p style={{ marginTop: 12 }}>Yuklanmoqda...</p>
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
