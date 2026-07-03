export default function AdminStubPage() {
  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, backgroundColor: "#F5F5F5" }}>
      <div style={{ width: "100%", maxWidth: 720, padding: 32, backgroundColor: "#fff", borderRadius: 20, boxShadow: "0 20px 60px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <h1 style={{ margin: 0, fontSize: "clamp(1.8rem, 3vw, 2.6rem)", fontWeight: 800, color: "#1a1a1a" }}>Admin panel</h1>
        <p style={{ marginTop: 14, color: "#555", fontSize: "1rem", lineHeight: 1.6 }}>
          Bu sahifa faqat adminlar uchun mo&apos;ljallangan. Hozircha faqat rollar va yo&apos;nalishlar sozlandi.
        </p>
        <a href="/admin/orders" style={{ marginTop: 20, display: "inline-block", padding: "12px 22px", borderRadius: 12, backgroundColor: "#7B2FBE", color: "#fff", textDecoration: "none", fontWeight: 700 }}>
          Buyurtmalarga o&apos;tish
        </a>
      </div>
    </div>
  );
}
