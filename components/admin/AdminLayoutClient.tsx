"use client";

import { useEffect, useState, useTransition, useCallback } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";
import AdminSidebar from "./AdminSidebar";

const PAGE_TITLES: Record<string, string> = {
  "/admin":            "Dashboard",
  "/admin/products":   "Mahsulotlar",
  "/admin/orders":     "Buyurtmalar",
  "/admin/categories": "Kategoriyalar",
};

export default function AdminLayoutClient({ children }: { children: React.ReactNode }) {
  const router  = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAppSelector((s) => s.auth);

  const [ready,      setReady]      = useState(false);   // auth check done
  const [navigating, setNavigating] = useState(false);   // page transition

  // Auth + role check
  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      router.replace("/admin/login");
      return;
    }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== "admin") {
          router.replace("/");
        } else {
          setReady(true);
        }
      });
  }, [user, authLoading, router]);

  // Navigating animation — pathname o'zgarganda qisqa flash
  useEffect(() => {
    setNavigating(true);
    const t = setTimeout(() => setNavigating(false), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  // Loading screen
  if (authLoading || !ready) {
    return (
      <div style={{
        minHeight: "100vh",
        background: "#1e1e2e",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: 16,
      }}>
        <div className="admin-spinner" />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: "0.875rem" }}>
          Yuklanmoqda...
        </div>
      </div>
    );
  }

  const title = PAGE_TITLES[pathname] || "Admin";
  const initials = (user?.full_name || user?.email || "A")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="admin-shell">
      {/* Sidebar — layout da, sahifa almashganda o'ZGARMAYDI */}
      <AdminSidebar />

      <div className="admin-main">
        {/* Top header */}
        <header className="admin-header">
          <span className="admin-header-title">{title}</span>
          <div className="admin-header-user">
            <span style={{ fontSize: "0.82rem", maxWidth: 200, overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>
              {user?.email}
            </span>
            <div className="admin-avatar">{initials}</div>
          </div>
        </header>

        {/* Progress bar — navigation indicator */}
        <div
          style={{
            height: 3,
            background: "linear-gradient(90deg, #7B2FBE, #a78bfa)",
            position: "fixed",
            top: 60,
            left: 240,
            right: 0,
            zIndex: 200,
            transform: navigating ? "scaleX(1)" : "scaleX(0)",
            transformOrigin: "left",
            transition: navigating
              ? "transform 0.25s ease-out"
              : "transform 0.15s ease-in, opacity 0.2s 0.15s",
            opacity: navigating ? 1 : 0,
          }}
        />

        {/* Page content with fade animation */}
        <div
          className="admin-page"
          style={{
            opacity: navigating ? 0.6 : 1,
            transition: "opacity 0.2s ease",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
