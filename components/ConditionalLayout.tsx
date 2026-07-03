"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/Footer";
import CartDrawer from "@/components/CartDrawer";
import WishlistDrawer from "@/components/WishlistDrawer";
import { ReactNode } from "react";

const NO_SHELL = ["/admin", "/admin/login", "/sales", "/sales/login", "/sales/register", "/login", "/register"];

function isNoShell(p: string) {
  return NO_SHELL.some((r) => p === r || p.startsWith(r + "/"));
}

interface Props {
  children: ReactNode;
  navbar: ReactNode;   // Server Component — props orqali beriladi
}

export default function ConditionalLayout({ children, navbar }: Props) {
  const pathname = usePathname();

  if (isNoShell(pathname)) {
    return <>{children}</>;
  }

  return (
    <>
      {navbar}
      <main style={{ flex: 1 }}>{children}</main>
      <Footer />
      <CartDrawer />
      <WishlistDrawer />
    </>
  );
}
