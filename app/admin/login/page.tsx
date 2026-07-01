"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useAppDispatch } from "@/store/hooks";
import { setUser } from "@/store/authSlice";

export default function AdminLoginPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });

    if (authErr) {
      setLoading(false);
      setError("Email yoki parol noto'g'ri");
      return;
    }

    if (!data.user) { setLoading(false); setError("Xatolik yuz berdi"); return; }

    // role tekshirish
    const { data: profile } = await supabase
      .from("profiles")
      .select("role, full_name, phone")
      .eq("id", data.user.id)
      .single();

    if (profile?.role !== "admin") {
      await supabase.auth.signOut();
      setLoading(false);
      setError("Sizda admin huquqi yo'q");
      return;
    }

    dispatch(setUser({
      id:        data.user.id,
      email:     data.user.email ?? "",
      full_name: (profile?.full_name as string) || "",
      phone:     (profile?.phone as string) || "",
      role:      "admin",
    }));

    router.replace("/admin");
  };

  const inp: React.CSSProperties = {
    width: "100%", height: 50, border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "0 16px", fontSize: "0.95rem", outline: "none",
    fontFamily: "inherit", backgroundColor: "#f9fafb", boxSizing: "border-box",
    transition: "border-color 0.2s, background 0.2s",
  };

  return (
    <div className="admin-login-page">
      <div className="admin-login-card">
        <div className="admin-login-logo">
          <div className="logo-icon">🔐</div>
          <h1>Admin Panel</h1>
          <p>Bozor boshqaruv tizimi</p>
        </div>

        {error && <div className="alert-error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email" required value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@bozor.uz"
              className="form-input"
              onFocus={(e) => { e.target.style.borderColor = "#7B2FBE"; e.target.style.background = "#fff"; }}
              onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Parol</label>
            <div style={{ position: "relative" }}>
              <input
                type={showPass ? "text" : "password"} required value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="form-input"
                style={{ paddingRight: 48 }}
                onFocus={(e) => { e.target.style.borderColor = "#7B2FBE"; e.target.style.background = "#fff"; }}
                onBlur={(e) => { e.target.style.borderColor = "#e5e7eb"; e.target.style.background = "#f9fafb"; }}
              />
              <button
                type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", fontSize: 18, color: "#9ca3af", fontFamily: "inherit" }}
              >
                {showPass ? "🙈" : "👁️"}
              </button>
            </div>
          </div>

          <button
            type="submit" disabled={loading}
            className="btn btn-primary"
            style={{ width: "100%", height: 50, marginTop: 8, fontSize: "1rem", borderRadius: 10, justifyContent: "center" }}
          >
            {loading ? "⏳ Kirish..." : "🔑 Kirish"}
          </button>
        </form>
      </div>
    </div>
  );
}
