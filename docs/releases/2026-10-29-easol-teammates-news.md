# 2026-10-29 Easol Teammates 音樂節營運 AI 新聞

狀態：內容及本機驗證完成；待建立 production --skip-domain build 並驗收，再提升同一 build。正式發布證據於完成後補記。

## 範圍與正式基線

- 今日只刊一篇；另外候選未取得充分一手資料，不湊三篇。
- 發布前核對 apex／www 為 READY `dpl_5epqX9GjDRn9aSz8PHi6uBsg7Bup`；工程證據對應應用 `67eec4c`。來源乾淨 HEAD `5882ac5` 與該應用只有文件差異，GitHub 分支唯讀讀回也是 `5882ac5`。
- 在本任務目錄建立獨立 checkout，原新聞工作樹與主 repo 既有大量未提交內容均未改動。
- 標題：AI 不只幫你寫歌：Easol 推出音樂節營運代理，支援客服、銷售與訂單工作。
- 目標文章：https://aipoger.com/news/easol-teammates-festival-ai-agents?lang=zh
- 目標列表：https://aipoger.com/news?lang=zh

## 編輯查核

- 事件日 2026-10-28；本站發布／查核日 2026-10-29。Easol 發布於 PR Newswire 的公司公告明列 10/28 11:00 ET，與未另列發布日期的官方產品頁分開。
- [公司公告](https://www.prnewswire.com/news-releases/experience-commerce-platform-easol-raises-30-million-launches-total-ai-solution-for-experience-businesses-302921596.html)、[Teammates](https://easol.com/teammates/)、[Easol Agent](https://easol.com/teammates/easol-agent/)、[Sales Agent](https://easol.com/teammates/sales-agent/)、[Support Agent](https://easol.com/teammates/support-agent/)及[官方 Newsroom](https://easol.com/newsroom/)均重新閱讀；[MBW](https://www.musicbusinessworldwide.com/event-tech-startup-easol-secures-30m-in-new-funding-launches-ai-agents-for-festival-promoters/)僅為議題發現來源。
- 聚焦平台內業務資料、三種代理與客服／訂單／銷售流程。公司功能說明有來源，簡化情境及採用建議明示為本站觀點；沒有假稱實測或作者親身經驗。
- 不引用未獨立核實的效率、收入、訂單回收數字；不談融資、不列客戶名單，避免把平台客戶寫成 Teammates 用戶。沒有宣稱音樂生成或新授權政策。
- 自製分工示意 SVG／1200×630 PNG，75,853 bytes；封面與正文均註明非產品介面，沒有取用新聞照片、官網圖片或 logo。

## 實際變更

- `src/components/easol-teammates-article.tsx`：獨立原創正文、三點摘要、代理分工圖解、愛波哥觀點、三件準備建議與討論問題。
- `src/lib/music-news.ts`：新增本篇 catalog、日期、來源及封面；沿原排序帶入列表及首頁最新最多三篇。
- `src/app/news/[slug]/page.tsx`：只新增正文 import 與 slug 對應，沿原 metadata／公開討論。
- `public/news/easol-teammates-festival-ai-agents.svg`、`.png`：原創封面。
- `tests/music-news-runtime.test.mjs`：六篇清單、四語 SSR／真實語言／來源／日期／分享 metadata／圖片／延伸閱讀回歸。
- `tests/public-seo-runtime.test.mjs`：新增本篇 Sitemap 預期，既有按新聞 edition 分隔的快取機制保留。
- 本發布紀錄。不修改 Supabase、key、排程、音檔清理、網站其他功能、依賴或字型。

## 本機驗證

- 45 項新聞／SEO／熱門排行定向測試全通過。
- 全套 968 項：926 通過／42 選用測試略過／0 失敗；沒有執行正式資料庫 QA。
- TypeScript 通過；lint 0 errors／9 筆既有 img warnings；`git diff --check` 通過。
- `npm run build -- --webpack` 通過。初次 sandbox 無法下載既有 Google Fonts；允許必要網路後原樣建置成功，未修改字型或設定。
- Chrome 實際開啟 1440×900 桌機與四語 320×812 文章：封面載入，沒有水平溢出；正文保持 zh-Hant，非中文介面有語言提示；手機摘要先於封面，延伸閱讀保留介面語言。
- 本機沿用既有被 ignore 的環境配置，未下載／修改正式 key。依昨日已知限制，資料 API 的完整驗收在待發布環境執行，不把本機正文成功當成資料 API 成功。
- Vercel dry upload 清單 1,161 檔，未包含環境檔、node_modules、本機證據或測試輸出。

## 待發布及正式驗收

待完成。只使用既有 Vercel 登入及已存在的驗收權限；不建立分享連結／bypass token、不調整保護或 Trusted Sources。

私人測試 log、HTTP 結果及截圖保存於 `/Users/huangyihong/Documents/Codex/2026-10-29/task/`，不提交或上傳。
