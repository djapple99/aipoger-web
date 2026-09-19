import React from "react";
import { SceneShell, CYAN, GOLD, ORANGE } from "./shared";
import { BibleLabel, BiblePanel, ModuleCard } from "./bible-shared";

export const BibleModules: React.FC = () => (
  <SceneShell kicker="8 PRACTICE MODULES" title="不只 Prompt" subtitle="一套資料庫，涵蓋創作、拆軌、台語與發表。" accent="cyan">
    <BiblePanel style={{ height: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <BibleLabel>從起手式一路練到發表</BibleLabel>
        <span style={{ color: GOLD, fontSize: 17, fontWeight: 900 }}>可搜尋 · 可複製 · 可回報</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 13 }}>
        <ModuleCard title="Prompt 招式庫" detail="73 招、80+ 曲風詞與私藏配方" color={ORANGE} />
        <ModuleCard title="歌詞調教" detail="段落、唱法、合唱、情緒與咬字" color={CYAN} />
        <ModuleCard title="聲音 DNA" detail="772 組聲音 DNA × Prompt 索引" color={GOLD} />
        <ModuleCard title="AI 拆軌避坑" detail="10 種引擎家族、7 條目標路線" color={ORANGE} />
      </div>
    </BiblePanel>
  </SceneShell>
);
