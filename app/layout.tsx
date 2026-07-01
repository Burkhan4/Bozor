import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v16-appRouter";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import ConditionalLayout from "@/components/ConditionalLayout";

const inter = Inter({ subsets: ["latin", "cyrillic"], display: "swap" });

export const metadata: Metadata = {
  title: "Bozor — O'zbekistonning onlayn do'koni",
  description: "Eng yaxshi narxlarda sifatli mahsulotlar. Tez yetkazib berish.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="uz" className={inter.className}>
      <body
        suppressHydrationWarning
        style={{ margin: 0, backgroundColor: "#F5F5F5", minHeight: "100vh", display: "flex", flexDirection: "column" }}
      >
        <AppRouterCacheProvider options={{ key: "mui" }}>
          <Providers>
            {/* Navbar Server Component — prop orqali beriladi, admin/login/register da ko'rsatilmaydi */}
            <ConditionalLayout navbar={<Navbar />}>
              {children}
            </ConditionalLayout>
          </Providers>
        </AppRouterCacheProvider>
      </body>
    </html>
  );
}
