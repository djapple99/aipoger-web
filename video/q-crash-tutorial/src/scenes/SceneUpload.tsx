import React from "react";
import { SceneShell, MusicCard, StepMarker, CYAN, ORANGE, GlassCard, MUTED } from "./shared";

export const SceneUpload: React.FC = () => (
  <SceneShell kicker="02 · UPLOAD" title="先上傳兩首歌" subtitle="每一邊放一首作品。系統會先讀取歌名，你也可以再修改。">
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 30, height: 510 }}>
      <div style={{ width: 260, display: "flex", flexDirection: "column", gap: 32 }}>
        <StepMarker number="1" label="作品 A" color={CYAN} />
        <StepMarker number="2" label="作品 B" color={ORANGE} />
        <GlassCard style={{ marginTop: 10, padding: 18, borderColor: "rgba(255,255,255,0.14)" }}>
          <div style={{ color: "#f7d49c", fontSize: 16, fontWeight: 900, letterSpacing: "0.12em" }}>可比較</div>
          <div style={{ marginTop: 9, color: MUTED, fontSize: 17, lineHeight: 1.5, fontWeight: 700 }}>自己的兩個版本，或邀請朋友的作品加入。</div>
        </GlassCard>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
        <MusicCard side="A" title="Midnight Signal" color={CYAN} />
        <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 34, fontWeight: 900 }}>VS</div>
        <MusicCard side="B" title="Neon Afterglow" color={ORANGE} />
      </div>
    </div>
  </SceneShell>
);
