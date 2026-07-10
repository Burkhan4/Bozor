"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppSelector } from "@/store/hooks";
import AdminSidebar from "./AdminSidebar";

const PAGE_TITLES: Record<string, string> = {
  "/":            "Dashboard",
  "/products":    "Mahsulotlar",
  "/orders":      "Buyurtmalar",
  "/categories":  "Kategoriyalar",
  "/sellers":     "Sotuvchilar",
};

interface AdminLayoutClientProps {
  children: React.ReactNode;
  allowedRole: "admin" | "salesman";
  loginPath: string;
  panelLabel: string;
  basePath: string;
}

export default function AdminLayoutClient({ children, allowedRole, loginPath, panelLabel, basePath }: AdminLayoutClientProps) {
  const router  = useRouter();
  const pathname = usePathname();
  const { user, loading: authLoading } = useAppSelector((s) => s.auth);

  const authPages = [loginPath];
  if (basePath === "/sales") {
    authPages.push("/sales/register");
  }

  const isAuthPage = authPages.includes(pathname);
  const [ready, setReady] = useState(isAuthPage);   // auth check done
  const [navigating, setNavigating] = useState(false);   // page transition

  // Auth + role check
  useEffect(() => {
    if (isAuthPage) {
      return;
    }

    if (authLoading) return;

    if (!user) {
      router.replace(loginPath);
      return;
    }

    supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data?.role !== allowedRole) {
          router.replace(loginPath);
        } else {
          setReady(true);
        }
      });
  }, [user, authLoading, router, loginPath, allowedRole, isAuthPage]);

  // Navigating animation — pathname o'zgarganda qisqa flash
  useEffect(() => {
    setNavigating(true);
    const t = setTimeout(() => setNavigating(false), 300);
    return () => clearTimeout(t);
  }, [pathname]);

  // Loading screen
  if (!isAuthPage && (authLoading || !ready)) {
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

  // If this is an auth page (login/register), do not render admin shell — just render children
  if (isAuthPage) {
    return <>{children}</>;
  }

  const relativePath = pathname.startsWith(basePath) ? pathname.slice(basePath.length) || "/" : pathname;
  const title = PAGE_TITLES[relativePath] || panelLabel;
  const initials = (user?.full_name || user?.email || "A")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="admin-shell">
      {/* Sidebar — layout da, sahifa almashganda o'ZGARMAYDI */}
      <AdminSidebar basePath={basePath} panelLabel={panelLabel} loginPath={loginPath} />

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
