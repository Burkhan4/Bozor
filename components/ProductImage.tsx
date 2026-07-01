"use client";

export default function ProductImage({ src, alt }: { src: string; alt: string }) {
  return (
    <div style={{
      width: "100%",
      maxWidth: 460,
      aspectRatio: "1/1",
      backgroundColor: "#f8f8f8",
      borderRadius: 16,
      overflow: "hidden",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 16,
    }}>
      <img
        src={src || "https://placehold.co/600x600/f3e8ff/7B2FBE?text=Rasm"}
        alt={alt}
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            "https://placehold.co/600x600/f3e8ff/7B2FBE?text=Rasm";
        }}
        style={{ width: "100%", height: "100%", objectFit: "contain" }}
      />
    </div>
  );
}
