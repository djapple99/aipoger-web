import React from "react";
import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";

export const CYAN = "#15d5ee";
export const CYAN_DARK = "#062c35";
export const ORANGE = "#ff6a21";
export const GOLD = "#ffc36d";
export const WHITE = "#f8fafc";
export const MUTED = "#a7b0bc";

export const SceneShell: React.FC<{ kicker: string; title: string; subtitle: string; accent?: "cyan" | "orange"; children: React.ReactNode }> = ({ kicker, title, subtitle, accent = "cyan", children }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const color = accent === "cyan" ? CYAN : ORANGE;
  const opacity = interpolate(frame, [0, 12, 330, 360], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const translate = interpolate(frame, [0, 16], [28, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: Easing.bezier(0.16, 1, 0.3, 1) });
  const reveal = spring({ frame, fps, config: { damping: 200, stiffness: 110, mass: 0.6 } });

  return (
    <div style={{ position: "absolute", top: 0, right: 80, bottom: 0, left: 80, opacity, translate: `0px ${translate}px` }}>
      <div style={{ position: "absolute", left: 0, top: 132, color, fontSize: 18, fontWeight: 900, letterSpacing: "0.28em" }}>{kicker}</div>
      <div style={{ position: "absolute", left: 0, top: 168, width: 920 }}>
        <h1 style={{ margin: 0, color: WHITE, fontSize: 68, lineHeight: 1.08, fontWeight: 950, letterSpacing: "-0.045em" }}>{title}</h1>
        <p style={{ margin: "22px 0 0", color: MUTED, fontSize: 25, lineHeight: 1.5, fontWeight: 700 }}>{subtitle}</p>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 348, bottom: 40, opacity: reveal }}>{children}</div>
    </div>
  );
};

export const GlassCard: React.FC<{ children: React.ReactNode; accent?: string; style?: React.CSSProperties }> = ({ children, accent = "rgba(255,255,255,0.12)", style }) => (
  <div style={{ border: `1px solid ${accent}`, background: "rgba(3, 9, 11, 0.8)", borderRadius: 22, boxShadow: "0 24px 70px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.05)", ...style }}>{children}</div>
);

export const Pill: React.FC<{ children: React.ReactNode; active?: boolean; accent?: "cyan" | "orange" | "gold" }> = ({ children, active = false, accent = "cyan" }) => {
  const color = accent === "orange" ? ORANGE : accent === "gold" ? GOLD : CYAN;
  return <span style={{ display: "inline-flex", alignItems: "center", gap: 8, border: `1px solid ${active ? color : "rgba(255,255,255,0.16)"}`, background: active ? `${color}18` : "rgba(255,255,255,0.035)", color: active ? color : "#cbd5e1", padding: "9px 15px", borderRadius: 999, fontSize: 18, fontWeight: 900 }}>{children}</span>;
};

export const Waveform: React.FC<{ color?: string; bars?: number; height?: number; seed?: number }> = ({ color = CYAN, bars = 30, height = 70, seed = 1 }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 5, height }}>
    {Array.from({ length: bars }, (_, index) => {
      const ratio = 0.2 + ((index * 17 + seed * 13) % 80) / 100;
      return <span key={index} style={{ width: 5, height: Math.max(9, height * ratio), borderRadius: 99, background: color, opacity: 0.5 + ratio * 0.5 }} />;
    })}
  </div>
);

export const MusicCard: React.FC<{ side: "A" | "B"; title: string; color: string; active?: boolean }> = ({ side, title, color, active = false }) => {
  const frame = useCurrentFrame();
  const scale = spring({ frame: frame - (side === "A" ? 0 : 8), fps: 30, config: { damping: 180, stiffness: 120 } });
  return (
    <GlassCard accent={`${color}70`} style={{ width: 440, padding: 24, opacity: frame < 0 ? 0 : 1, scale: 0.92 + 0.08 * scale }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ color, fontSize: 18, fontWeight: 950, letterSpacing: "0.18em" }}>作品 {side}</span>
        {active ? <Pill active accent={side === "A" ? "cyan" : "orange"}>已選取</Pill> : null}
      </div>
      <div style={{ height: 130, margin: "22px 0", borderRadius: 15, background: `linear-gradient(135deg, ${color}28, rgba(255,255,255,0.03)), repeating-radial-gradient(circle at 60% 35%, transparent 0 16px, ${color}22 18px 20px)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 74, height: 74, borderRadius: "50%", border: `2px solid ${color}`, boxShadow: `0 0 34px ${color}55`, display: "flex", alignItems: "center", justifyContent: "center", color, fontSize: 32 }}>▶</div>
      </div>
      <div style={{ color: WHITE, fontSize: 30, fontWeight: 950, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{title}</div>
      <div style={{ marginTop: 8, color: MUTED, fontSize: 17, fontWeight: 700 }}>60s Drop · AI 音樂作品</div>
      <div style={{ marginTop: 17 }}><Waveform color={color} bars={28} height={44} seed={side === "A" ? 3 : 7} /></div>
    </GlassCard>
  );
};

export const StepMarker: React.FC<{ number: string; label: string; color?: string }> = ({ number, label, color = CYAN }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 13 }}><span style={{ width: 38, height: 38, borderRadius: "50%", display: "inline-flex", alignItems: "center", justifyContent: "center", color: "#020506", background: color, fontSize: 18, fontWeight: 950 }}>{number}</span><span style={{ color: WHITE, fontSize: 21, fontWeight: 900 }}>{label}</span></div>
);

export const Timeline: React.FC = () => (
  <div style={{ position: "relative", width: 720, height: 86 }}>
    <div style={{ position: "absolute", left: 0, right: 0, top: 37, height: 6, borderRadius: 99, background: "rgba(255,255,255,0.16)" }} />
    <div style={{ position: "absolute", left: 108, top: 29, width: 386, height: 22, borderRadius: 8, border: `2px solid ${CYAN}`, background: `${CYAN}28`, boxShadow: `0 0 28px ${CYAN}33` }} />
    <span style={{ position: "absolute", left: 0, top: 61, color: MUTED, fontSize: 15, fontWeight: 800 }}>0:00</span>
    <span style={{ position: "absolute", left: 473, top: 61, color: CYAN, fontSize: 15, fontWeight: 900 }}>60 秒</span>
    <span style={{ position: "absolute", right: 0, top: 61, color: MUTED, fontSize: 15, fontWeight: 800 }}>整首歌</span>
    <span style={{ position: "absolute", left: 265, top: 0, color: CYAN, fontSize: 17, fontWeight: 950, letterSpacing: "0.1em" }}>DROP 範圍</span>
  </div>
);

export const ShareArrow: React.FC = () => <span style={{ color: CYAN, fontSize: 42, fontWeight: 300 }}>→</span>;
