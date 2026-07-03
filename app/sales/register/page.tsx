"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function SalesRegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [organization, setOrganization] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Parollar mos kelmadi");
      return;
    }
    if (password.length < 6) {
      setError("Parol kamida 6 ta belgi bo'lishi kerak");
      return;
    }
    if (!fullName.trim()) {
      setError("To'liq ism va familiya kiritilishi kerak");
      return;
    }

    setLoading(true);
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    });

    if (err) {
      setLoading(false);
      setError(err.message.includes("already registered") ? "Bu email allaqachon ro&apos;yxatdan o&apos;tgan." : err.message);
      return;
    }

    if (data?.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        role: "salesman",
        organization: organization || null,
        telegram_connected: false,
        created_at: new Date().toISOString(),
      });
    }

    setLoading(false);
    if (data?.user && !data.session) {
      setSuccess(true);
      return;
    }

    router.push("/sales/login");
  };

  const inp: React.CSSProperties = {
    width: "100%",
    height: 52,
    border: "1.5px solid #e5e7eb",
    borderRadius: 12,
    padding: "0 16px",
    fontSize: "1rem",
    outline: "none",
    fontFamily: "inherit",
    backgroundColor: "#f9fafb",
    boxSizing: "border-box",
    transition: "all 0.2s",
  };

  const onFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#7B2FBE";
    e.target.style.background = "#fff";
  };

  const onBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.style.borderColor = "#e5e7eb";
    e.target.style.background = "#f9fafb";
  };

  if (success) {
    return (
      <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#ecfeff 0%,#d1fae5 50%,#bbf7d0 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
        <div style={{ width: "100%", maxWidth: 460, background: "#fff", borderRadius: 20, padding: "44px 40px", boxShadow: "0 20px 60px rgba(123,47,190,0.12)", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: 16 }}>✅</div>
          <h1 style={{ margin: "0 0 12px", fontWeight: 800, fontSize: "1.6rem", color: "#1a1a1a" }}>Ro&apos;yxatdan o&apos;tish muvaffaqiyatli</h1>
          <p style={{ margin: "0 0 24px", color: "#666", fontSize: "0.95rem" }}>
            Elektron pochtangizga tasdiq xati yuborildi. Iltimos, tizimga kirish uchun emailni tasdiqlang.
          </p>
          <Link href="/sales/login" style={{ display: "inline-block", background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", borderRadius: 12, padding: "14px 18px", fontWeight: 700, textDecoration: "none" }}>
            Sotuvchi kirish sahifasiga o&apos;tish
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#ecfeff 0%,#d1fae5 50%,#bbf7d0 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 520, background: "#fff", borderRadius: 20, padding: "44px 40px", boxShadow: "0 20px 60px rgba(123,47,190,0.12)" }}>
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🛍️</span>
            <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "#7B2FBE" }}>Bozor</span>
          </Link>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: "1.6rem", color: "#1a1a1a" }}>Sotuvchi ro&apos;yxatdan o&apos;tish</h1>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: "0.9rem" }}>Sotuvchi hisobini yarating</p>
        </div>

        {error && (
          <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: "0.875rem", color: "#dc2626" }}>
            {error}
          </div>
        )}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>To&apos;liq ism *</label>
            <input type="text" required value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Ism Familiya" style={inp} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Tashkilot / do&apos;kon nomi</label>
            <input type="text" value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Do&apos;kon nomi" style={inp} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@misol.com" style={inp} onFocus={onFocus} onBlur={onBlur} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Parol *</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" style={{ ...inp, paddingRight: 52 }} onFocus={onFocus} onBlur={onBlur} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", fontFamily: "inherit" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Parolni tasdiqlash *</label>
            <input type={showPass ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Qayta kiriting" style={{ ...inp, borderColor: confirm && confirm !== password ? "#f87171" : "#e5e7eb" }} onFocus={onFocus} onBlur={onBlur} />
            {confirm && confirm !== password && <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#ef4444" }}>Parollar mos kelmadi</p>}
          </div>

          <button type="submit" disabled={loading || (!!confirm && confirm !== password)} style={{ width: "100%", height: 52, marginTop: 4, background: loading ? "#c4b5fd" : "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit", transition: "all 0.2s" }}>
            {loading ? "⏳ Yuklanmoqda..." : "Ro&apos;yxatdan o&apos;tish"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
          Hisobingiz bormi?{' '}
          <Link href="/sales/login" style={{ color: "#7B2FBE", fontWeight: 700, textDecoration: "none" }}>
            Sotuvchi sifatida kirish
          </Link>
        </p>
      </div>
    </div>
  );
}
