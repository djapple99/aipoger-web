import React from "react";
import { SceneShell, CYAN, GOLD, MUTED, ORANGE, WHITE } from "./shared";
import { BibleLabel, BiblePanel, IndexChip } from "./bible-shared";

export const BibleWorkflow: React.FC = () => (
  <SceneShell kicker="THE SUNO CONTROL DESK" title="從輸入到成品" subtitle="Style、Lyrics、Title 分開處理，再過生成前檢查。" accent="orange">
    <div style={{ display: "flex", gap: 18, flexDirection: "column", height: "100%" }}>
      <div style={{ display: "flex", gap: 18 }}>
        <BiblePanel accent={CYAN} style={{ flex: 1 }}><BibleLabel>01 · Style</BibleLabel><div style={{ marginTop: 13, color: WHITE, fontSize: 26, fontWeight: 950 }}>曲風與聲音</div><div style={{ marginTop: 7, color: MUTED, fontSize: 16, fontWeight: 700 }}>先決定你要聽見什麼。</div></BiblePanel>
        <BiblePanel accent={ORANGE} style={{ flex: 1 }}><BibleLabel color={ORANGE}>02 · Lyrics</BibleLabel><div style={{ marginTop: 13, color: WHITE, fontSize: 26, fontWeight: 950 }}>段落與唱法</div><div style={{ marginTop: 7, color: MUTED, fontSize: 16, fontWeight: 700 }}>把情緒寫進結構裡。</div></BiblePanel>
        <BiblePanel accent={GOLD} style={{ flex: 1 }}><BibleLabel color={GOLD}>03 · Title</BibleLabel><div style={{ marginTop: 13, color: WHITE, fontSize: 26, fontWeight: 950 }}>命名與辨識</div><div style={{ marginTop: 7, color: MUTED, fontSize: 16, fontWeight: 700 }}>讓版本不再搞混。</div></BiblePanel>
      </div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "17px 22px", border: "1px solid rgba(255,195,109,0.46)", borderRadius: 16, background: "rgba(255,195,109,0.07)" }}>
        <div><div style={{ color: GOLD, fontSize: 15, fontWeight: 950, letterSpacing: "0.18em" }}>PRE-FLIGHT CHECK</div><div style={{ marginTop: 8, color: WHITE, fontSize: 20, fontWeight: 900 }}>先檢查，再按生成</div></div>
        <div style={{ display: "flex", gap: 10 }}><IndexChip accent="gold">同一 Prompt 做 3 版</IndexChip><IndexChip>留下成功條件</IndexChip></div>
      </div>
    </div>
  </SceneShell>
);
