# 首頁新作輪替與連結投稿曝光 — 2026-10-25

使用者要求修正精選首頁／探索歌曲長期不換作品，新投稿沒有被帶入。應用 `544736f`，發布分支 `codex/public-rule-copy`。Vercel `dpl_DYaF89v334r7SmmgnqXeqJepc7Bz`、`aipoger-web-rnz8-74cs19vg0-yohungs-projects.vercel.app`，READY並已promote到 `aipoger.com`；正式網址已回查解析到同一部署。

## 原因與結果

- 原MV主視覺只取本週最高支持者，支持數未變就持續固定；修復前為《阮袂認命》與《微醺》兩支同票作品。
- 原探索三首要求audioUrl，排除只有YouTube／Suno／Spotify連結的新投稿；修復前三首日期仍為10月14、13及11日，正式曲庫已有多支10月25日作品。
- 主視覺沿用原黑橘版型，改為「現在值得一看」，近30天最多三支新作＋至多一個本週支持席次。最新MV始終在本組，首四小時先顯示，其後按台灣時間00／04／08／12／16／20時輪替。先輪創作者、再輪作品，避免同作者批量投稿占住輪替序列。新作不需先獲愛心或評分；無近期MV才以既有公開作品回退，標「發現好作品」。
- 探索三首沿三個日曆月資格，排除上方全部作品ID，一首最新＋兩首近期輪替；MP3及原支援的有效外站連結都可入選。MP3用既有共用播放器，連結用官方嵌入播放器與原評論評分同窗，不新增假audioUrl或託管外站音檔。
- 每分鐘與返回頁面更新仍保留；播放中的MV與開啟中的評論綁定原作品快照，不隨候選刷新被替換。使用者主動切歌才換播放器，沒有強制自動切播。
- 每週支持去重／非作者規則、Explore／MV人氣榜公式、原評分／評論／回覆／收藏／Credit／戰績皆不變。MV API保留原週支持候選與完整清單，首頁輪替獨立處理。沒有DB migration、Auth／RLS改動或正式作品內容寫入。

## 驗證

- 29項首頁與MV針對性測試通過；全套838項，802通過／36選用測試略過／0失敗。新增六項選曲測試涵蓋新作無支持曝光、台灣跨時段輪替、連結來源、創作者批次公平、公開／專輯／期滿／去重邊界與舊作真實標示；兩項UI runtime驗證連結打開既有評價視窗，刷新移除原候選時仍保留播放中的iframe與評論草稿元件。
- TypeScript通過；lint 0 errors／9既有warnings。本機webpack及Vercel原雲端build通過；本機跨工作樹node_modules symlink不符合Turbopack root範圍，改用webpack驗證，未為此修改專案設定。
- 先以既有CLI登入讀取staged正式環境API與SSR HTML，未下載正式敏感環境值。本機缺正式設定的API 503沒有當作資料驗收成功；staged瀏覽器受Vercel登入保護，使用vercel curl核對真實資料，沒有建立新的bypass、放寬保護或更改SSO。
- staged與修復前比較：97支MV全部保留，影片ID／原投稿時間／平均評分／評分人數／總和／週支持相同，60件人氣排序ID順序一致。首頁4支MV及3首探索去重，三首連結有合法來源，API不回傳會員／投票者ID；SSR初始HTML包含真實MV與單曲名稱。
- promote同一READY版本後，正式首頁立即顯示新投稿《假鬼假怪欸暗席》，探索首位帶入《你已不在身邊》等新連結。正式API已回查rotationKey／4支MV／3首單曲，四語首頁及auth、listen-bar、music-analysis、battle/setup、mv共9入口200。
- 1440×900桌機與320／390×844手機瀏覽器驗收。320px四語scrollWidth均305px、390px四語均375px（扣除捲軸），三張探索卡正常，無水平溢出；保留原四語導覽與社群入口，非實體iOS測試。
- 正式YouTube MV可實際播放，開啟原評論再返回後仍保留同一影片URL，經過時間到1:43且未回到0；單曲連結能載入官方YouTube播放器、原作品評論與評分。訪客評分欄仍disabled且提示登入。登入後送評價／輸入期間不被刷新重建以runtime驗證，未使用正式會員發測試評論、評分或Heart。
- 正式首頁瀏覽器error log為空。畫面／尺寸JSON／API快照保存於私人 `New project/audits/2026-10-25-home-rotation/`，不提交用戶資料、環境檔或截圖。

## 文件與回復

現行產品規則、體驗、工程、固定索引及私人agent／roadmap以本次行為原地更新，移除新作輪替待辦。Google Drive沿既有六個ID同步、讀回校驗；不建立第二套規格。應用SHA與後續文件commit分開記錄。必要時可promote上一個READY部署 `dpl_5Xn2RHQTVXb9NoDiGUjuhAFu6kEF` 回復應用，無SQL回滾或資料刪除需求。
