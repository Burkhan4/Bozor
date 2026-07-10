"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import { logout } from "@/store/authSlice";

interface AdminSidebarProps {
  basePath: string;
  panelLabel: string;
  loginPath: string;
}

const NAV = [
  { slug: "",            icon: "📊", label: "Dashboard" },
  { slug: "/products",   icon: "📦", label: "Mahsulotlar" },
  { slug: "/orders",     icon: "🛒", label: "Buyurtmalar" },
  { slug: "/categories", icon: "🏷️", label: "Kategoriyalar" },
];

export default function AdminSidebar({ basePath, panelLabel, loginPath }: AdminSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((s) => s.auth);
  const [profileDate, setProfileDate] = useState<string | null>(null);

  useEffect(() => {
    if (!user || basePath !== "/sales") return;

    // Fetch initial profile date
    supabase
      .from("profiles")
      .select("date")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) setProfileDate(data.date || null);
      });

    // Subscribe to changes on profiles table for this user
    const channel = supabase
      .channel(`profile-sidebar-changes-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "profiles",
          filter: `id=eq.${user.id}`,
        },
        (payload) => {
          setProfileDate((payload.new as any).date || null);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, basePath]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    dispatch(logout());
    router.push(loginPath);
  };

  const navItems = basePath === "/admin"
    ? [
        { slug: "/orders",     icon: "🛒", label: "Buyurtmalar" },
        { slug: "/sellers",    icon: "👥", label: "Sotuvchilar" },
      ]
    : NAV;

  const initials = (user?.full_name || user?.email || "A")
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const todayStr = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tashkent",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

  const isSubActive = !!(profileDate && profileDate > todayStr);

  const formatDateUz = (dateStr: string) => {
    if (!dateStr) return "";
    const parts = dateStr.split("-");
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}.${parts[1]}.${parts[0]}`; // DD.MM.YYYY
  };

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <span>🛍️ Bozor</span>
        <small>{panelLabel}</small>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {navItems.map(({ slug, icon, label }) => {
          const href = `${basePath}${slug}`;
          const isActive = slug === ""
            ? pathname === basePath
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

        {/* Subscription Status Block */}
        {basePath === "/sales" && (
          <div
            className="sidebar-sub-card"
            style={{
              margin: "12px 14px",
              padding: "14px",
              borderRadius: "10px",
              background: "rgba(255, 255, 255, 0.04)",
              border: "1px solid rgba(255, 255, 255, 0.08)",
              color: "#fff",
            }}
          >
            <div style={{ fontSize: "0.8rem", color: "rgba(255,255,255,0.5)", marginBottom: 8, fontWeight: 500 }}>
              Obuna holati:
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 700, fontSize: "0.95rem", marginBottom: 10 }}>
              {isSubActive ? (
                <span style={{ color: "#4ade80" }}>✅ Faol</span>
              ) : (
                <span style={{ color: "#f87171" }}>❌ Faol emas</span>
              )}
            </div>

            <div style={{ fontSize: "0.75rem", color: "rgba(255,255,255,0.6)", lineHeight: 1.4, marginBottom: 12 }}>
              Obuna amal qiladi:<br />
              <strong style={{ color: "#fff" }}>
                {profileDate ? `${formatDateUz(profileDate)} gacha` : "mavjud emas"}
              </strong>
            </div>

            {!isSubActive && (
              <Link
                href="/sales"
                className="btn btn-primary btn-sm"
                style={{
                  display: "block",
                  textAlign: "center",
                  textDecoration: "none",
                  fontSize: "0.75rem",
                  padding: "6px 12px",
                  borderRadius: 6,
                  fontWeight: 700,
                  width: "100%",
                }}
              >
                Obunani faollashtirish
              </Link>
            )}
          </div>
        )}
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
