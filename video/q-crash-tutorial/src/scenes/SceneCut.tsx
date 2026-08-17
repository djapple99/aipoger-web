import React from "react";
import { SceneShell, GlassCard, Timeline, CYAN, ORANGE, MUTED, Waveform } from "./shared";

export const SceneCut: React.FC = () => (
  <SceneShell kicker="03 · CUT THE DROP" title="剪出最有力的 60 秒" subtitle="沿用現有 Drop 裁切器，抓住歌曲最值得重播的那一段。">
    <div style={{ display: "flex", alignItems: "center", gap: 42, height: 510 }}>
      <GlassCard accent={`${CYAN}62`} style={{ width: 1030, padding: 32 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ color: WHITE, fontSize: 27, fontWeight: 950 }}>作品 A · Midnight Signal</div><span style={{ color: CYAN, fontSize: 18, fontWeight: 950 }}>剪裁中</span></div>
        <div style={{ marginTop: 28, padding: "19px 24px", borderRadius: 15, background: "rgba(255,255,255,0.045)" }}><Waveform color={CYAN} bars={54} height={86} seed={11} /></div>
        <div style={{ marginTop: 18 }}><Timeline /></div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 6 }}><span style={{ color: MUTED, fontSize: 18, fontWeight: 700 }}>可剪短，但不能超過 60 秒</span><span style={{ color: CYAN, fontSize: 21, fontWeight: 950 }}>60s DROP</span></div>
      </GlassCard>
      <div style={{ width: 260 }}>
        <div style={{ color: ORANGE, fontSize: 17, fontWeight: 950, letterSpacing: "0.18em" }}>KEY MOVE</div>
        <div style={{ marginTop: 15, color: WHITE, fontSize: 34, lineHeight: 1.15, fontWeight: 950 }}>不要放整首歌。<br /><span style={{ color: ORANGE }}>放最會打的 Drop。</span></div>
      </div>
    </div>
  </SceneShell>
);

const WHITE = "#f8fafc";
