"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button, CircularProgress } from "@mui/material";
import { CheckCircle, CloudUpload, ShoppingBag } from "@mui/icons-material";
import { supabase } from "@/lib/supabase";
import { isTelegramConnected } from "@/lib/supabase";
import type { Profile } from "@/lib/supabase";
import { useAppSelector, useAppDispatch } from "@/store/hooks";
import { clearCart } from "@/store/cartSlice";
import { formatPrice } from "@/lib/format";
import { sendOrderCreatedNotification } from "@/lib/telegram";

const TG_BOT = "bozor_sayt_bot";

export default function CheckoutPage() {
  const router   = useRouter();
  const dispatch = useAppDispatch();
  const { user, loading: authLoading } = useAppSelector((s) => s.auth);
  const { items } = useAppSelector((s) => s.cart);
  const total = items.reduce((s, i) => s + i.price * i.quantity, 0);

  const [profile,   setProfile]   = useState<Profile | null>(null);
  const [profLoad,  setProfLoad]  = useState(true);
  const [sellerOrganization, setSellerOrganization] = useState<string | null>(null);

  const [firstName, setFirstName] = useState("");
  const [lastName,  setLastName]  = useState("");
  const [phone,     setPhone]     = useState("");
  const [comment,   setComment]   = useState("");

  const [checkFile,    setCheckFile]    = useState<File | null>(null);
  const [checkPreview, setCheckPreview] = useState<string | null>(null);
  const [uploading,    setUploading]    = useState(false);
  const [submitting,   setSubmitting]   = useState(false);
  const [error,        setError]        = useState("");
  const [success,      setSuccess]      = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  // 1. Auth redirect
  useEffect(() => {
    if (!authLoading && !user) router.replace("/login?redirect=/checkout");
  }, [user, authLoading, router]);

  // 2. Load profile (telegram_connected + prefill)
  useEffect(() => {
    if (!user) return;
    setProfLoad(true);
    supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        const prof = data as Profile | null;
        setProfile(prof);
        if (prof?.full_name) {
          const parts = prof.full_name.split(" ");
          setFirstName(parts[0] || "");
          setLastName(parts.slice(1).join(" ") || "");
        }
        if (prof?.phone) setPhone(prof.phone);
        setProfLoad(false);
      });
  }, [user]);

  useEffect(() => {
    if (items.length === 0) {
      setSellerOrganization(null);
      return;
    }

    const sellerId = items[0]?.salesman_id;
    if (!sellerId) {
      setSellerOrganization(null);
      return;
    }

    supabase
      .from("profiles")
      .select("organization")
      .eq("id", sellerId)
      .single()
      .then(({ data }) => {
        setSellerOrganization(data?.organization ?? null);
      });
  }, [items]);

  // 3. Re-check when window gets focus (user came back from Telegram)
  useEffect(() => {
    const onFocus = () => {
      if (!user) return;
      supabase.from("profiles").select("*").eq("id", user.id).single()
        .then(({ data }) => setProfile(data as Profile | null));
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [user]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { setError("Fayl hajmi 5MB dan kichik bo'lishi kerak"); return; }
    setCheckFile(file);
    setCheckPreview(URL.createObjectURL(file));
    setError("");
  };

  const uploadCheck = async (): Promise<string | null> => {
    if (!checkFile || !user) return null;
    setUploading(true);
    const ext  = checkFile.name.split(".").pop();
    const path = `${user.id}/${Date.now()}.${ext}`;
    const { error: upErr } = await supabase.storage
      .from("payment_checks")
      .upload(path, checkFile, { upsert: true });
    setUploading(false);
    if (upErr) { setError("Chekni yuklashda xatolik: " + upErr.message); return null; }
    const { data } = supabase.storage.from("payment_checks").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // ── Validation ──
    if (!user)              return;
    if (items.length === 0) { setError("Savatcha bo'sh"); return; }
    if (!firstName.trim() || !phone.trim()) { setError("Ism va telefon majburiy"); return; }

    // Telegram check
    if (!isTelegramConnected(profile?.telegram_connected)) {
      setError("Buyurtma berish uchun avval Telegram botni ulang");
      return;
    }

    // Check required
    if (!checkFile) {
      setError("To'lov chekini yuklang");
      return;
    }

    setSubmitting(true);

    // 1. Upload check
    const paymentCheckUrl = await uploadCheck();
    if (!paymentCheckUrl) { setSubmitting(false); return; }

    // 2. Create order
    const { data: orderData, error: orderErr } = await supabase
      .from("orders")
      .insert({
        user_id:       user.id,          // UUID
        total_price:   total,
        status:        "pending",
        payment_check: paymentCheckUrl,  // saved URL
      })
      .select()
      .single();

    if (orderErr || !orderData) {
      setError("Buyurtma yaratishda xatolik: " + (orderErr?.message || ""));
      setSubmitting(false);
      return;
    }

    // 3. Create order_items
    const { error: itemsErr } = await supabase.from("order_items").insert(
      items.map((item) => ({
        order_id:   orderData.id,
        product_id: item.id,
        quantity:   item.quantity,
        price:      item.price,
      }))
    );
    if (itemsErr) {
      setError("Buyurtma mahsulotlarini saqlashda xatolik: " + itemsErr.message);
      setSubmitting(false);
      return;
    }

    // 4. Update profile
    await supabase.from("profiles").upsert(
      { id: user.id, full_name: `${firstName} ${lastName}`.trim(), phone },
      { onConflict: "id" }
    );

    // 5. Clear cart → success
    dispatch(clearCart());

    // 6. Telegram xabarnoma — xato bo'lsa buyurtma bekor qilinmaydi
    sendOrderCreatedNotification(orderData.id);

    setSuccess(true);
    setSubmitting(false);
  };

  // ── Loading states ──
  if (authLoading || profLoad) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <CircularProgress sx={{ color: "#7B2FBE" }} />
      </div>
    );
  }
  if (!user) return null;

  // ── Success ──
  if (success) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "#F5F5F5", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ maxWidth: 420, width: "100%", backgroundColor: "#fff", borderRadius: 16, padding: "40px 28px", boxShadow: "0 8px 32px rgba(0,0,0,0.08)", textAlign: "center", margin: "0 16px" }}>
          <div style={{ width: 72, height: 72, borderRadius: "50%", background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 20px" }}>
            <CheckCircle style={{ color: "#fff", fontSize: 40 }} />
          </div>
          <h2 style={{ margin: "0 0 10px", fontWeight: 800, fontSize: "1.4rem", color: "#1a1a1a" }}>
            Buyurtma qabul qilindi!
          </h2>
          <p style={{ margin: "0 0 8px", color: "#666", fontSize: "0.95rem", lineHeight: 1.6 }}>
            Buyurtmangiz muvaffaqiyatli joylashtirildi.
          </p>
          <p style={{ margin: "0 0 28px", color: "#16a34a", fontSize: "0.875rem", fontWeight: 600 }}>
            ✈️ Telegram orqali xabarnoma yuboriladi
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <Button variant="contained" fullWidth onClick={() => router.push("/profile")}
              sx={{ py: 1.4, borderRadius: 2, background: "linear-gradient(135deg,#7B2FBE,#9B5FD5)", fontWeight: 700 }}>
              Buyurtmalarni ko'rish
            </Button>
            <Button variant="outlined" fullWidth onClick={() => router.push("/")}
              sx={{ py: 1.4, borderRadius: 2, borderColor: "#7B2FBE", color: "#7B2FBE", fontWeight: 600 }}>
              Bosh sahifaga qaytish
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const tgConnected = isTelegramConnected(profile?.telegram_connected);

  const inp: React.CSSProperties = {
    width: "100%", height: 46, border: "1.5px solid #e5e7eb", borderRadius: 10,
    padding: "0 14px", fontSize: "0.9rem", outline: "none", fontFamily: "inherit",
    backgroundColor: "#fafafa", boxSizing: "border-box",
  };
  const onF = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#7B2FBE"; e.target.style.backgroundColor = "#fff";
  };
  const onB = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    e.target.style.borderColor = "#e5e7eb"; e.target.style.backgroundColor = "#fafafa";
  };

  return (
    <div style={{ backgroundColor: "#F5F5F5", minHeight: "100vh" }}>
      <div className="page-container">
        <h1 style={{ margin: "0 0 24px", fontWeight: 800, fontSize: "clamp(1.3rem, 3vw, 1.8rem)", color: "#1a1a1a" }}>
          Buyurtmani rasmiylashtirish
        </h1>

        {/* ── Telegram not connected banner ── */}
        {!tgConnected && (
          <div style={{
            backgroundColor: "#fffbeb", border: "1.5px solid #fde68a",
            borderRadius: 12, padding: "16px 20px", marginBottom: 24,
            display: "flex", flexDirection: "column", gap: 12,
          }}>
            <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1.4rem", flexShrink: 0 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#92400e", marginBottom: 4 }}>
                  Buyurtma berish uchun avval Telegram botni ulang
                </div>
                <div style={{ fontSize: "0.85rem", color: "#b45309", lineHeight: 1.5 }}>
                  Buyurtmangiz holati haqida Telegram orqali xabarnoma olasiz.
                  Botga o'tib <strong>/start</strong> ni bosing.
                </div>
              </div>
            </div>
            <button
              onClick={() => window.open(`https://t.me/${TG_BOT}?start=${user.id}`, "_blank", "noopener,noreferrer")}
              style={{
                alignSelf: "flex-start", padding: "10px 20px",
                background: "linear-gradient(135deg,#0088CC,#0099EE)",
                color: "#fff", border: "none", borderRadius: 8,
                fontWeight: 700, fontSize: "0.875rem", cursor: "pointer",
                fontFamily: "inherit", display: "flex", alignItems: "center", gap: 8,
              }}
            >
              ✈️ Telegram botga o'tish
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="checkout-layout">

            {/* ── LEFT ── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

              {/* Contact */}
              <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 18px", fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>
                  📋 Buyurtmachi ma'lumotlari
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.8rem", color: "#374151" }}>Ism *</label>
                    <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Ism" style={inp} onFocus={onF} onBlur={onB} />
                  </div>
                  <div>
                    <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.8rem", color: "#374151" }}>Familiya</label>
                    <input value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Familiya" style={inp} onFocus={onF} onBlur={onB} />
                  </div>
                </div>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.8rem", color: "#374151" }}>Telefon *</label>
                  <input value={phone} onChange={(e) => setPhone(e.target.value)} required placeholder="+998 90 000 00 00" style={inp} onFocus={onF} onBlur={onB} />
                </div>
                <div>
                  <label style={{ display: "block", marginBottom: 6, fontWeight: 600, fontSize: "0.8rem", color: "#374151" }}>Izoh</label>
                  <textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Qo'shimcha ma'lumot..." rows={3}
                    style={{ ...inp, height: "auto", padding: "10px 14px", resize: "vertical" }} onFocus={onF} onBlur={onB} />
                </div>
              </div>

              {/* Payment check — REQUIRED */}
              <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 4px", fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>
                  💳 To'lov cheki <span style={{ color: "#ef4444", fontSize: "0.85rem" }}>*</span>
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: "0.82rem", color: "#888" }}>
                  To'lovni amalga oshirib chekni yuklang (majburiy)
                </p>

                <input ref={fileRef} type="file" accept="image/*,.pdf" onChange={handleFileChange} style={{ display: "none" }} />

                {checkPreview ? (
                  <div style={{ position: "relative" }}>
                    <img src={checkPreview} alt="Chek"
                      style={{ width: "100%", maxHeight: 200, objectFit: "contain", borderRadius: 10, border: "1.5px solid #a7f3d0", backgroundColor: "#f0fdf4" }} />
                    <button type="button"
                      onClick={() => { setCheckFile(null); setCheckPreview(null); if (fileRef.current) fileRef.current.value = ""; }}
                      style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "50%", backgroundColor: "#ef4444", color: "#fff", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: "1rem" }}>
                      ×
                    </button>
                    <p style={{ margin: "8px 0 0", fontSize: "0.82rem", color: "#16a34a", fontWeight: 600 }}>
                      ✓ Chek yuklandi
                    </p>
                  </div>
                ) : (
                  <button type="button" onClick={() => fileRef.current?.click()}
                    style={{ width: "100%", padding: "22px", border: "2px dashed #d8b4fe", borderRadius: 12, backgroundColor: "#faf5ff", cursor: "pointer", fontFamily: "inherit", display: "flex", flexDirection: "column", alignItems: "center", gap: 8, transition: "all 0.2s" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#7B2FBE"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#f3e8ff"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.borderColor = "#d8b4fe"; (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#faf5ff"; }}>
                    <CloudUpload style={{ fontSize: 36, color: "#7B2FBE" }} />
                    <span style={{ fontWeight: 700, color: "#7B2FBE", fontSize: "0.875rem" }}>Chekni yuklash</span>
                    <span style={{ fontSize: "0.75rem", color: "#aaa" }}>PNG, JPG, PDF • max 5MB</span>
                  </button>
                )}
              </div>
            </div>

            {/* ── RIGHT ── */}
            <div style={{ height: "fit-content", position: "sticky", top: 20 }}>
              <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "22px", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
                <h2 style={{ margin: "0 0 18px", fontWeight: 700, fontSize: "1rem", color: "#1a1a1a" }}>
                  🛒 Buyurtma ({items.length} ta)
                </h2>

                {items.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "20px 0", color: "#aaa" }}>
                    <p style={{ margin: 0 }}>Savatcha bo'sh</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 16 }}>
                    {sellerOrganization && (
                      <div style={{ fontSize: "0.94rem", color: "#374151", fontWeight: 700, padding: "10px 14px", backgroundColor: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12 }}>
                        Sotuvchi: {sellerOrganization}
                      </div>
                    )}
                    {items.map((item) => (
                      <div key={item.id} style={{ display: "flex", gap: 10, alignItems: "center" }}>
                        <img src={item.image || "https://placehold.co/48x48/f3e8ff/7B2FBE?text=?"} alt={item.name}
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "https://placehold.co/48x48/f3e8ff/7B2FBE?text=?"; }}
                          style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain", backgroundColor: "#f8f8f8", flexShrink: 0, padding: 2 }} />
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontWeight: 600, fontSize: "0.82rem", overflow: "hidden", whiteSpace: "nowrap", textOverflow: "ellipsis" }}>{item.name}</p>
                          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "#888" }}>{item.quantity} × {formatPrice(item.price)}</p>
                        </div>
                        <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1a1a1a", flexShrink: 0 }}>{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: 14, marginBottom: 18 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: "0.875rem" }}>
                    <span style={{ color: "#666" }}>Mahsulotlar</span>
                    <span style={{ fontWeight: 600 }}>{formatPrice(total)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14, fontSize: "0.875rem" }}>
                    <span style={{ color: "#666" }}>Yetkazib berish</span>
                    <span style={{ fontWeight: 600, color: "#16a34a" }}>Bepul</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ fontWeight: 700, fontSize: "1rem" }}>Jami:</span>
                    <span style={{ fontWeight: 800, fontSize: "1.2rem", color: "#7B2FBE" }}>{formatPrice(total)}</span>
                  </div>
                </div>

                {/* Telegram status */}
                <div style={{
                  display: "flex", alignItems: "center", gap: 8,
                  padding: "9px 12px", borderRadius: 8, marginBottom: 14,
                  backgroundColor: tgConnected ? "#f0fdf4" : "#fffbeb",
                  border: `1px solid ${tgConnected ? "#bbf7d0" : "#fde68a"}`,
                  fontSize: "0.82rem",
                  color: tgConnected ? "#16a34a" : "#92400e",
                }}>
                  <span>{tgConnected ? "✅" : "⚠️"}</span>
                  <span style={{ fontWeight: 600 }}>
                    {tgConnected ? "Telegram ulangan" : "Telegram ulanmagan"}
                  </span>
                </div>

                {error && (
                  <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: "0.82rem", color: "#dc2626" }}>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  fullWidth
                  variant="contained"
                  size="large"
                  disabled={submitting || uploading || items.length === 0 || !tgConnected}
                  startIcon={submitting || uploading ? <CircularProgress size={18} color="inherit" /> : <ShoppingBag />}
                  sx={{
                    py: 1.75, fontWeight: 700, fontSize: "1rem", borderRadius: "10px",
                    background: !tgConnected ? "#e5e7eb" : "linear-gradient(135deg,#7B2FBE,#9B5FD5)",
                    color: !tgConnected ? "#9ca3af" : "#fff",
                    "&:hover": { background: !tgConnected ? "#e5e7eb" : "linear-gradient(135deg,#5A1F8A,#7B2FBE)" },
                    "&.Mui-disabled": { background: "#e9d5ff", color: "#fff" },
                  }}
                >
                  {submitting ? "Yuborilmoqda..." : uploading ? "Yuklanmoqda..." : "Buyurtma berish"}
                </Button>

                {!tgConnected && (
                  <button
                    type="button"
                    onClick={() => window.open(`https://t.me/${TG_BOT}?start=${user.id}`, "_blank", "noopener,noreferrer")}
                    style={{ width: "100%", marginTop: 10, padding: "11px", background: "linear-gradient(135deg,#0088CC,#0099EE)", color: "#fff", border: "none", borderRadius: 10, fontWeight: 700, fontSize: "0.875rem", cursor: "pointer", fontFamily: "inherit", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
                  >
                    ✈️ Telegram botni ulash
                  </button>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 5, marginTop: 10, color: "#bbb", fontSize: "0.75rem" }}>
                  🔒 Xavfsiz to'lov kafolatlangan
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>

      <style>{`
        .checkout-layout {
          display: grid;
          grid-template-columns: 1fr;
          gap: 20px;
          align-items: start;
        }
        @media (min-width: 768px) {
          .checkout-layout { grid-template-columns: 1fr 380px; gap: 24px; }
        }
      `}</style>
    </div>
  );
}
