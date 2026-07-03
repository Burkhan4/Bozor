"use client";

const sections = [
  { title: "Kompaniya", links: ["Biz haqimizda", "Yangiliklar", "Karyera", "Hamkorlik"] },
  { title: "Yordam", links: ["Ko'p so'raladigan savollar", "Yetkazib berish", "Qaytarish", "Bog'lanish"] },
  { title: "Kategoriyalar", links: ["Elektronika", "Kiyim-kechak", "Oziq-ovqat", "Uy-ro'zg'or"] },
];

const contacts = [
  { icon: "📞", text: "+998 71 200 00 00" },
  { icon: "✉️", text: "info@bozor.uz" },
  { icon: "📍", text: "Toshkent, O'zbekiston" },
];

const socials = [
  { label: "Telegram", icon: "✈️", color: "#0088CC" },
  { label: "Instagram", icon: "📸", color: "#E1306C" },
  { label: "Facebook", icon: "👥", color: "#1877F2" },
];

export default function Footer() {
  return (
    <footer className="ft-root" style={{ position: "relative", zIndex: 1110 }}>
      <div className="ft-container">
        <div className="ft-grid">

          {/* Brand */}
          <div className="ft-brand">
            <div className="ft-logo">
              <span style={{ fontSize: 26 }}>🛍️</span>
              <span className="ft-logo-text">Bozor</span>
            </div>
            <p className="ft-desc">
              O'zbekistonning eng qulay va ishonchli onlayn do'koni.
              Eng yaxshi narxlarda sifatli mahsulotlar.
            </p>
            <div className="ft-contacts">
              {contacts.map(({ icon, text }) => (
                <div key={text} className="ft-contact-row">
                  <span>{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Links */}
          {sections.map((s) => (
            <div key={s.title}>
              <p className="ft-section-title">{s.title}</p>
              <div className="ft-links">
                {s.links.map((l) => (
                  <a key={l} href="#" className="ft-link">{l}</a>
                ))}
              </div>
            </div>
          ))}

          {/* Socials */}
          <div>
            <p className="ft-section-title">Ijtimoiy tarmoqlar</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 20 }}>
              {socials.map(({ label, icon, color }) => (
                <button
                  key={label}
                  aria-label={label}
                  className="ft-social-btn"
                  style={{ "--social-color": color } as React.CSSProperties}
                >
                  {icon}
                </button>
              ))}
            </div>
            <p style={{ margin: "0 0 8px", color: "rgba(255,255,255,0.45)", fontSize: "0.75rem" }}>
              Ilovamizni yuklab oling:
            </p>
            {["📱 App Store", "🤖 Google Play"].map((l) => (
              <div key={l} className="ft-app-btn">{l}</div>
            ))}
          </div>
        </div>

        <hr className="ft-divider" />

        <div className="ft-bottom">
          <span>© {new Date().getFullYear()} Bozor.uz — Barcha huquqlar himoyalangan</span>
          <div style={{ display: "flex", gap: 20, flexWrap: "wrap" }}>
            {["Maxfiylik siyosati", "Foydalanish shartlari"].map((l) => (
              <a key={l} href="#" className="ft-bottom-link">{l}</a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
