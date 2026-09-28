# Music Bible 2.0 第一階段發布證據

發布日期：2026-09-28 Asia/Taipei。使用者已明確授權「確定了然後就部署」。

- 應用提交：`ae1f196`；分支 `codex/music-bible-2`，已 push。
- Vercel：`dpl_J3kTgFEt1nof95Nb2wSvxZ6gcQnr`，READY；先以 skip-domain 完成建置，再 promote。以 `aipoger.com` 查詢部署已解析至此 ID。
- 部署網址：https://aipoger-web-rnz8-57htwq5uc-yohungs-projects.vercel.app
- 正式入口：https://aipoger.com/ai-music-bible?lang=zh
- 上一個可回復部署：`dpl_Bfniz6ZbAyzAzAj4VcBH43x64hrV`（app `952c1bc`）。

## 已發布範圍

五入口 Knowledge / Style DNA / Prompts / Workflows / Solve My Problem；Ask Music Agent 隱藏。前台不標新舊資料或新增 lifecycle metadata，原來源與證據說明保留。新增資料層欄位 `platform`、`model`、`modelVersion`、`lastVerifiedAt`、`status`；模型、版本與日期未知值保持 null，status 可用 Verified / Experimental / Legacy / Deprecated，未作 member 分類或排除條件。

原 163 Prompt moves、21 lyric moves、38 台語條目、772 DNA、747 recipes 的原文、ID、排序與搜尋資料保留。無 SQL migration；沒有刪除或改寫正式內容。部署檔案清單已排除 `.env*`、截圖、測試輸出與本機 cache；原 dirty 工作區的無關改動未混入。

## 驗證

- 全套測試：478 項，447 passed、31 原有 optional DB skipped、0 failed。
- `npx tsc --noEmit` 通過。曾發現已移除臨時預覽路由留在 `.next/dev/types` 的生成快取；清除該生成快取後重跑通過，沒有更改應用程式來掩蓋錯誤。
- Lint：0 errors、16 既有 warnings。本機與 Vercel production build 通過。
- 保留內容逐筆比對；未知值、有效日期／Verified 驗證；metadata-only 更新保留原文、舊客戶端更新保留 metadata；會員 401、private no-store、缺表靜態回退測試通過。
- 真實已登入 Chrome 正式站：五入口點擊、DNA／排錯展開、Prompt 搜尋「七格」回傳 1 招、複製得到七格聲音 DNA 原文、清空搜尋恢復資料；command search 開啟與 Escape 關閉通過。Ask Music Agent 與新增 Legacy Library 面板皆不存在，console error 0。
- 中英日韓切換各維持五入口（日韓會員內容沿用英文）；桌機及手機觀察無頁面水平溢出。手機 override 實際 DOM clientWidth 與 scrollWidth 均為 375，驗收後已 reset。
- 未登入 IAB 仍顯示會員登入提示、保留 return URL，不包含會員搜尋內容；API `/api/ai-music-bible/content` 未登入返回 401。
- 正式 `/`、`/auth`、`/listen-bar`、`/music-analysis`、`/battle/setup?lang=zh`、`/ai-music-bible?lang=zh` 全為 HTTP 200。
- 正式畫面：本機 `output/playwright/bible-production-five-areas.png`；工具輸出未入 Git 或部署。

限制：owner metadata 儲存由隔離 runtime 驗證；本次未為測試寫入正式條目。無真正 Music Agent；逐筆模型適用性驗證、DNA／配方編輯擴充與跨工具流程列於現行 roadmap。

## 應用變更檔案

- `src/app/admin/ai-music-bible/page.tsx`
- `src/app/api/admin/ai-music-bible/content/route.ts`
- `src/app/api/ai-music-bible/content/route.ts`
- `src/components/ai-music-bible-page.tsx`
- `src/components/bible-command-dock.tsx`
- `src/components/bible-home.tsx`
- `src/components/suno-inspiration-index-section.tsx`
- `src/components/suno-practice-library-section.tsx`
- `src/lib/ai-music-bible-content.ts`
- `src/lib/bible-metadata.ts`
- `src/lib/suno-inspiration-index.ts`
- `src/lib/suno-practice-library.ts`
- `src/lib/taiwanese-lyrics-lab.ts`
- `tests/music-bible-2.test.mjs`

現行規則、體驗、工程、協作入口、roadmap 與索引已同步至既有 Google Drive ID；六份讀回正文與本機逐字一致。
