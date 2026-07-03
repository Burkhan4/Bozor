"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SalesLoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/sales";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) {
      setLoading(false);
      setError("Email yoki parol noto'g'ri.");
      return;
    }

    if (!data?.user) {
      setLoading(false);
      setError("Xatolik yuz berdi. Qayta urinib ko'ring.");
      return;
    }

    const { data: profile, error: profileErr } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", data.user.id)
      .single();

    if (profileErr || profile?.role !== "salesman") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Bu akkaunt sotuvchi uchun emas.");
      return;
    }

    setLoading(false);
    router.push(redirectTo);
  };

  const inp: React.CSSProperties = {
    width: "100%", height: 52, border: "1.5px solid #e5e7eb", borderRadius: 12,
    padding: "0 16px", fontSize: "1rem", outline: "none", fontFamily: "inherit",
    backgroundColor: "#f9fafb", boxSizing: "border-box", transition: "all 0.2s",
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#ecfeff 0%,#d1fae5 50%,#bbf7d0 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 20, padding: "44px 40px", boxShadow: "0 20px 60px rgba(123,47,190,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🛍️</span>
            <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "#7B2FBE" }}>Bozor</span>
          </Link>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: "1.6rem", color: "#1a1a1a" }}>Sotuvchi kirish</h1>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: "0.9rem" }}>Sotuvchi hisobingizga kiring</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: "0.875rem", color: "#dc2626" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@misol.com" style={inp}
              onFocus={(e) => { e.target.style.borderColor = "#7B2FBE"; e.target.style.background = "#fff"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; }}
            />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Parol</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••" style={{ ...inp, paddingRight: 52 }}
                onFocus={(e) => { e.target.style.borderColor = "#7B2FBE"; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; }}
              />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", fontFamily: "inherit" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button type="submit" disabled={loading}
            style={{ width: "100%", height: 52, marginTop: 4, background: loading ? "#c4b5fd" : "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
            {loading ? "⏳ Kirish..." : "Kirish"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
          Hisobingiz yo&apos;qmi?{' '}
          <Link href="/sales/register" style={{ color: "#7B2FBE", fontWeight: 700, textDecoration: "none" }}>
            Sotuvchi sifatida ro&apos;yxatdan o&apos;tish
          </Link>
        </p>
      </div>
    </div>
  );
}
