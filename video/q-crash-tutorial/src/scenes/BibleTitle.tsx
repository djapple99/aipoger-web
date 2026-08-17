import React from "react";
import { SceneShell, CYAN, GOLD, MUTED, WHITE } from "./shared";
import { BibleLabel, BiblePanel, IndexChip, StatBlock } from "./bible-shared";

export const BibleTitle: React.FC = () => (
  <SceneShell kicker="AIPOGER · CREATOR TOOLBOX" title="AI 音樂練功聖經" subtitle="把卡關，變成下一首歌的捷徑。" accent="cyan">
    <div style={{ display: "flex", gap: 24, height: "100%" }}>
      <BiblePanel style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
        <div>
          <BibleLabel>不是看完就算的教學頁</BibleLabel>
          <div style={{ marginTop: 18, color: WHITE, fontSize: 31, fontWeight: 950, lineHeight: 1.2 }}>把 Prompt、歌詞、聲音 DNA<br />整理成可反覆查的實戰資料庫。</div>
        </div>
        <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
          <IndexChip>Prompt</IndexChip>
          <IndexChip accent="orange">Lyrics</IndexChip>
          <IndexChip accent="gold">Sound DNA</IndexChip>
        </div>
      </BiblePanel>
      <BiblePanel accent={GOLD} style={{ width: 480, display: "flex", flexDirection: "column", justifyContent: "center", gap: 24 }}>
        <StatBlock value="1,519" label="組可搜尋索引" />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ display: "flex", gap: 30 }}>
          <StatBlock value="772" label="聲音 DNA" color={CYAN} />
          <StatBlock value="747" label="去重配方" color={GOLD} />
        </div>
        <div style={{ color: MUTED, fontSize: 16, fontWeight: 800 }}>複製、評論、共同驗證</div>
      </BiblePanel>
    </div>
  </SceneShell>
);
