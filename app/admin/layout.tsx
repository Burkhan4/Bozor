import type { Metadata } from "next";
import "./admin.css";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Admin Panel — Bozor",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutClient
      allowedRole="admin"
      loginPath="/admin/login"
      panelLabel="Admin Panel"
      basePath="/admin"
    >
      {children}
    </AdminLayoutClient>
  );
}
