"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function RegisterPage() {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [showPass,  setShowPass]  = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");
  const [success,   setSuccess]   = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) { setError("Parollar mos kelmadi"); return; }
    if (password.length < 6)  { setError("Parol kamida 6 ta belgi"); return; }

    setLoading(true);
    const fullName = `${firstName} ${lastName}`.trim();

    const { data, error: err } = await supabase.auth.signUp({
      email, password,
      options: { data: { full_name: fullName } },
    });

    if (err) {
      setLoading(false);
      setError(err.message.includes("already registered") ? "Bu email allaqachon ro'yxatdan o'tgan." : err.message);
      return;
    }

    if (data.user) {
      await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        role: "user",
        telegram_connected: false,
        created_at: new Date().toISOString(),
      });
    }

    setLoading(false);
    if (data.user && !data.session) { setSuccess(true); return; }
    router.push("/");
  };

  const inp: React.CSSProperties = {
    width: "100%", height: 52, border: "1.5px solid #e5e7eb", borderRadius: 12,
    padding: "0 16px", fontSize: "1rem", outline: "none", fontFamily: "inherit",
    backgroundColor: "#f9fafb", boxSizing: "border-box", transition: "all 0.2s",
  };
  const onF = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#7B2FBE"; e.target.style.background = "#fff"; };
  const onB = (e: React.FocusEvent<HTMLInputElement>) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; };

  if (success) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f5f3ff,#ede9fe,#ddd6fe)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ maxWidth: 440, width: "100%", background: "#fff", borderRadius: 20, padding: "44px 40px", boxShadow: "0 20px 60px rgba(123,47,190,0.12)", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: 16 }}>📧</div>
        <h2 style={{ margin: "0 0 12px", fontWeight: 800, fontSize: "1.4rem" }}>Emailingizni tasdiqlang</h2>
        <p style={{ color: "#666", marginBottom: 24 }}><strong>{email}</strong> manziliga xat yuborildi.</p>
        <Link href="/login" style={{ display: "block", background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", borderRadius: 12, padding: "14px", fontWeight: 700, textDecoration: "none" }}>
          Kirish sahifasiga →
        </Link>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#f5f3ff 0%,#ede9fe 50%,#ddd6fe 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}>
      <div style={{ width: "100%", maxWidth: 480, background: "#fff", borderRadius: 20, padding: "44px 40px", boxShadow: "0 20px 60px rgba(123,47,190,0.12)" }}>

        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <Link href="/" style={{ textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <span style={{ fontSize: 28 }}>🛍️</span>
            <span style={{ fontWeight: 900, fontSize: "1.4rem", color: "#7B2FBE" }}>Bozor</span>
          </Link>
          <h1 style={{ margin: 0, fontWeight: 800, fontSize: "1.6rem", color: "#1a1a1a" }}>Ro'yxatdan o'tish</h1>
          <p style={{ margin: "6px 0 0", color: "#888", fontSize: "0.9rem" }}>Yangi hisob yarating</p>
        </div>

        {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: "0.875rem", color: "#dc2626" }}>{error}</div>}

        <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Ism *</label>
              <input type="text" required value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ism" style={inp} onFocus={onF} onBlur={onB} />
            </div>
            <div>
              <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Familiya *</label>
              <input type="text" required value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" style={inp} onFocus={onF} onBlur={onB} />
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Email *</label>
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@misol.com" style={inp} onFocus={onF} onBlur={onB} />
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Parol *</label>
            <div style={{ position: "relative" }}>
              <input type={showPass ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Kamida 6 ta belgi" style={{ ...inp, paddingRight: 52 }} onFocus={onF} onBlur={onB} />
              <button type="button" onClick={() => setShowPass(!showPass)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 20, color: "#9ca3af", fontFamily: "inherit" }}>
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <div>
            <label style={{ display: "block", marginBottom: 7, fontWeight: 600, fontSize: "0.875rem", color: "#374151" }}>Parolni tasdiqlash *</label>
            <input type={showPass ? "text" : "password"} required value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder="Qayta kiriting"
              style={{ ...inp, borderColor: confirm && confirm !== password ? "#f87171" : "#e5e7eb" }} onFocus={onF} onBlur={onB} />
            {confirm && confirm !== password && <p style={{ margin: "4px 0 0", fontSize: "0.8rem", color: "#ef4444" }}>Parollar mos kelmadi</p>}
          </div>

          <button type="submit" disabled={loading || (!!confirm && confirm !== password)}
            style={{ width: "100%", height: 52, marginTop: 4, background: loading ? "#c4b5fd" : "linear-gradient(135deg,#7B2FBE,#9B5FD5)", color: "#fff", border: "none", borderRadius: 12, fontWeight: 700, fontSize: "1rem", cursor: loading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
            {loading ? "⏳ Yuklanmoqda..." : "Ro'yxatdan o'tish"}
          </button>
        </form>

        <p style={{ marginTop: 24, textAlign: "center", color: "#666", fontSize: "0.9rem" }}>
          Hisobingiz bormi?{" "}
          <Link href="/login" style={{ color: "#7B2FBE", fontWeight: 700, textDecoration: "none" }}>Kirish</Link>
        </p>
      </div>
    </div>
  );
}
