import React from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { GlassCard, Pill, SceneShell, CYAN, GOLD, ORANGE, WHITE, MUTED } from "./shared";

export const SceneResult: React.FC = () => {
  const frame = useCurrentFrame();
  const winnerScale = interpolate(frame, [0, 22], [0.78, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const points = "220,84 314,154 278,266 160,266 124,154";
  return (
    <SceneShell kicker="07 · RESULT" title="截止後，公開結果" subtitle="達到至少 3 位非參賽者觀眾才成立正式戰績；勝出作品會留下五角評分分布。">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 60, height: 510 }}>
        <GlassCard accent={`${GOLD}70`} style={{ width: 760, padding: 34, textAlign: "center" }}>
          <Pill active accent="gold">Q CRASH · RESULT</Pill>
          <div style={{ marginTop: 23, color: GOLD, fontSize: 19, fontWeight: 950, letterSpacing: "0.2em" }}>WINNER</div>
          <div style={{ marginTop: 8, color: WHITE, fontSize: 43, fontWeight: 950, scale: winnerScale }}>作品 A · Midnight Signal</div>
          <div style={{ marginTop: 8, color: MUTED, fontSize: 20, fontWeight: 700 }}>3 位以上觀眾完成投票 · 正式戰績成立</div>
          <div style={{ marginTop: 30, display: "flex", justifyContent: "center", gap: 12 }}><span style={{ width: 16, height: 16, borderRadius: "50%", background: CYAN }} /><span style={{ width: 16, height: 16, borderRadius: "50%", background: CYAN }} /><span style={{ width: 16, height: 16, borderRadius: "50%", background: CYAN }} /><span style={{ width: 16, height: 16, borderRadius: "50%", background: "rgba(255,255,255,0.18)" }} /></div>
        </GlassCard>
        <div style={{ width: 390, textAlign: "center" }}>
          <svg viewBox="0 0 440 330" width="390" height="292" style={{ overflow: "visible" }}>
            <polygon points={points} fill={`${CYAN}18`} stroke={CYAN} strokeWidth="4" />
            <polygon points="220,126 267,161 249,217 190,217 173,161" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="2" />
            <line x1="220" y1="84" x2="220" y2="220" stroke="rgba(255,255,255,0.2)" strokeWidth="2" /><line x1="124" y1="154" x2="278" y2="266" stroke="rgba(255,255,255,0.2)" strokeWidth="2" /><line x1="314" y1="154" x2="160" y2="266" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
            <text x="220" y="45" textAnchor="middle" fill={CYAN} fontSize="19" fontWeight="900">押韻</text><text x="350" y="132" textAnchor="middle" fill={CYAN} fontSize="19" fontWeight="900">爆點</text><text x="300" y="300" textAnchor="middle" fill={CYAN} fontSize="19" fontWeight="900">旋律</text><text x="140" y="300" textAnchor="middle" fill={CYAN} fontSize="19" fontWeight="900">情緒</text><text x="90" y="132" textAnchor="middle" fill={CYAN} fontSize="19" fontWeight="900">結構</text>
          </svg>
          <div style={{ marginTop: -3, color: ORANGE, fontSize: 25, fontWeight: 950 }}>五角評分分布</div>
          <div style={{ marginTop: 10, color: MUTED, fontSize: 17, fontWeight: 700 }}>結果公開後，還能回來重聽與留言。</div>
        </div>
      </div>
    </SceneShell>
  );
};
