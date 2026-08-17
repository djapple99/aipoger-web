import React from "react";
import { SceneShell, CYAN, GOLD, MUTED, ORANGE, WHITE } from "./shared";
import { BibleLabel, BiblePanel, IndexChip, SearchLine, StatBlock } from "./bible-shared";

export const BibleIndex: React.FC = () => (
  <SceneShell kicker="SEARCH BEFORE YOU GUESS" title="先找得到，再練得會" subtitle="從聲音 DNA 到歌詞調教，先用搜尋把問題縮小。" accent="cyan">
    <div style={{ display: "flex", gap: 24, height: "100%" }}>
      <BiblePanel style={{ flex: 1 }}>
        <BibleLabel>搜尋你的卡關</BibleLabel>
        <div style={{ marginTop: 18 }}><SearchLine value="vocal tone · 台語 · Drop" /></div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, marginTop: 22 }}>
          <IndexChip>聲音 DNA</IndexChip>
          <IndexChip accent="orange">Prompt</IndexChip>
          <IndexChip accent="gold">歌詞</IndexChip>
          <IndexChip>Stem</IndexChip>
        </div>
        <div style={{ marginTop: 24, color: MUTED, fontSize: 17, lineHeight: 1.45, fontWeight: 750 }}>把模糊的「不對勁」，轉成可以搜尋、複製、比較的問題。</div>
      </BiblePanel>
      <BiblePanel accent={GOLD} style={{ width: 480, display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
        <StatBlock value="73" label="Prompt 招式" color={ORANGE} />
        <StatBlock value="80+" label="曲風詞與私藏配方" color={CYAN} />
        <div style={{ height: 1, background: "rgba(255,255,255,0.12)" }} />
        <div style={{ color: WHITE, fontSize: 20, fontWeight: 900 }}>搜尋 → 複製 → 實測</div>
        <div style={{ color: MUTED, fontSize: 16, fontWeight: 750 }}>每一筆資料都不是只讓你收藏。</div>
      </BiblePanel>
    </div>
  </SceneShell>
);
