import React from "react";
import { CYAN, GOLD, GlassCard, MUTED, ORANGE, Pill, WHITE } from "./shared";

export const BiblePanel: React.FC<{ children: React.ReactNode; accent?: string; style?: React.CSSProperties }> = ({ children, accent = CYAN, style }) => (
  <GlassCard accent={`${accent}70`} style={{ padding: 22, ...style }}>
    {children}
  </GlassCard>
);

export const BibleLabel: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = CYAN }) => (
  <div style={{ color, fontSize: 15, fontWeight: 950, letterSpacing: "0.18em", textTransform: "uppercase" }}>{children}</div>
);

export const IndexChip: React.FC<{ children: React.ReactNode; accent?: "cyan" | "orange" | "gold" }> = ({ children, accent = "cyan" }) => (
  <Pill active accent={accent}>{children}</Pill>
);

export const SearchLine: React.FC<{ value: string }> = ({ value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, height: 58, padding: "0 18px", border: "1px solid rgba(21,213,238,0.65)", borderRadius: 14, background: "rgba(21,213,238,0.08)", boxShadow: "0 0 32px rgba(21,213,238,0.12)" }}>
    <span style={{ color: CYAN, fontSize: 26, fontWeight: 900 }}>⌕</span>
    <span style={{ color: WHITE, fontSize: 22, fontWeight: 850 }}>{value}</span>
    <span style={{ marginLeft: "auto", color: MUTED, fontSize: 15, fontWeight: 800 }}>搜尋索引</span>
  </div>
);

export const StatBlock: React.FC<{ value: string; label: string; color?: string }> = ({ value, label, color = CYAN }) => (
  <div style={{ display: "flex", alignItems: "baseline", gap: 13 }}>
    <span style={{ color, fontSize: 38, lineHeight: 1, fontWeight: 950, letterSpacing: "-0.04em" }}>{value}</span>
    <span style={{ color: MUTED, fontSize: 17, fontWeight: 850 }}>{label}</span>
  </div>
);

export const ModuleCard: React.FC<{ title: string; detail: string; color?: string }> = ({ title, detail, color = CYAN }) => (
  <div style={{ minHeight: 108, padding: "17px 18px", border: `1px solid ${color}4d`, borderRadius: 16, background: "rgba(255,255,255,0.035)" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span style={{ width: 9, height: 9, borderRadius: "50%", background: color, boxShadow: `0 0 16px ${color}` }} />
      <span style={{ color: WHITE, fontSize: 20, fontWeight: 950 }}>{title}</span>
    </div>
    <div style={{ marginTop: 9, color: MUTED, fontSize: 16, lineHeight: 1.4, fontWeight: 700 }}>{detail}</div>
  </div>
);

export const RatingBadge: React.FC<{ children: React.ReactNode; color?: string }> = ({ children, color = GOLD }) => (
  <span style={{ display: "inline-flex", alignItems: "center", border: `1px solid ${color}80`, borderRadius: 999, padding: "8px 13px", color, background: `${color}12`, fontSize: 16, fontWeight: 900 }}>{children}</span>
);

export const PracticeArrow: React.FC = () => <div style={{ color: ORANGE, fontSize: 36, fontWeight: 300 }}>→</div>;
