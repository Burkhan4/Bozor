"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/authSlice";

const NAV = [
  { href: "/admin",            icon: "📊", label: "Dashboard" },
  { href: "/admin/products",   icon: "📦", label: "Mahsulotlar" },
  { href: "/admin/orders",     icon: "🛒", label: "Buyurtmalar" },
  { href: "/admin/categories", icon: "🏷️", label: "Kategoriyalar" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(logout());
    router.push("/admin/login");
  };

  const initials = (user?.full_name || user?.email || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span>🛍️ Bozor</span>
        <small>Admin Panel</small>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {NAV.map(({ href, icon, label }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`sidebar-link ${isActive ? "active" : ""}`}
            >
              <span className="icon">{icon}</span>
              {label}
            </Link>
          );
        })}

        <div className="sidebar-divider" />

        <Link href="/" className="sidebar-link" target="_blank">
          <span className="icon">🌐</span>
          Saytga o'tish
        </Link>
      </nav>

      {/* Logout */}
      <div className="sidebar-logout">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
          <div className="admin-avatar">{initials}</div>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: "0.82rem", color: "#fff", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {user?.full_name || user?.email?.split("@")[0] || "Admin"}
            </div>
            <div style={{ fontSize: "0.7rem", color: "rgba(255,255,255,0.4)", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {user?.email}
            </div>
          </div>
        </div>
        <button onClick={handleLogout} className="btn btn-danger btn-sm" style={{ width: "100%" }}>
          🚪 Chiqish
        </button>
      </div>
    </aside>
  );
}
