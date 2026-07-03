import type { Metadata } from "next";
import "../admin/admin.css";
import AdminLayoutClient from "@/components/admin/AdminLayoutClient";

export const metadata: Metadata = {
  title: "Sotuvchi paneli — Bozor",
};

export default function SalesLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminLayoutClient
      allowedRole="salesman"
      loginPath="/sales/login"
      panelLabel="Sotuvchi Paneli"
      basePath="/sales"
    >
      {children}
    </AdminLayoutClient>
  );
}
