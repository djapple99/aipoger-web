import { ImageResponse } from "next/og";
export function bibleShareImage(title: string, subtitle = "PUBLIC PRACTICE GUIDE") {
  return new ImageResponse(<div style={{ display: "flex", width: "100%", height: "100%", background: "#090a0c", color: "#faf2e4", padding: "72px", flexDirection: "column", justifyContent: "space-between", borderLeft: "20px solid #ff8f32" }}>
    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 25, letterSpacing: 4, color: "#ffae62" }}><span>AIPOGER</span><span>CREATION BIBLE</span></div>
    <div style={{ display: "flex", fontSize: 61, lineHeight: 1.15, fontWeight: 700, maxWidth: 1000 }}>{title}</div>
    <div style={{ display: "flex", gap: 18, alignItems: "center", fontSize: 22, color: "#b9b1a8" }}><span style={{ width: 58, height: 4, background: "#ff8f32" }} /><span>{subtitle}</span></div>
  </div>, { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600, s-maxage=3600" } });
}
