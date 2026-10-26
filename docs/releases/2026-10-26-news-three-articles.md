# 2026-10-26 三篇音樂新聞與權益分析

使用者批准 Suno／Reservoir 與 Spotify × Believe 兩篇選題，並要求當天連同 YouTube 共三篇；本輪「OK~~do it」授權完成網站發布。日期均為 Asia/Taipei。

- 應用 commit：`53365da`；GitHub `codex/public-rule-copy` 已推送。
- 部署：`dpl_GEQBKTPqepFmsERT3UkFRpBPDwXW`，Vercel READY。先建立 production --skip-domain，同一個已驗收 build promote 後，get_deployment(aipoger.com) 返回此 ID。
- 待驗收網址：`https://aipoger-web-rnz8-gwhk4m657-yohungs-projects.vercel.app`。
- 正式：[音樂新聞](https://aipoger.com/news?lang=zh)、[Suno／Reservoir](https://aipoger.com/news/suno-reservoir-lawsuit-commercial-rights?lang=zh)、[Spotify × Believe](https://aipoger.com/news/spotify-believe-licensed-ai-remixes?lang=zh)。
- 前版回滾目標：`dpl_2cW555nJYzdaHMDJEmbjWNmCWGrB`（`b80ae04`）。本輪無資料庫遷移。

## 完成行為

新增兩篇原創繁中圖文，延續黑橘封面與先講三點重點、再展開圖解／愛波哥觀點的文章格式。每篇有獨立正文、事件日期、來源、1200×630 PNG／可編輯SVG與專屬metadata；兩篇封面約65KB／71KB。首頁與列表呈現三篇，底部延伸閱讀保留介面語言，對應討論問題可跳到既有文章留言區。

新聞仍以繁中全文公開，四語介面如實提示本文語言；SSR初始HTML包含真正正文，中文canonical、NewsArticle citation及Sitemap不混用YouTube資料。未知slug仍404。沿用已發布會員按讚／評論及Owner管理，訪客可讀、寫入須驗證登入；不新增Credit、評分或音樂作品資料。沒有修改播放／邊聽邊評論元件、Auth／RLS／Storage或既有新聞互動資料。

## 編輯查核

- Suno事件：2026-10-21提告；核對28頁起訴狀、公開案件登錄，1,050為音樂著作。原告指控不寫成判決，不把每首用戶作品預判侵權。
- 商用說明：核對Suno 2026-09-03生效條款及同日更新說明，包含合規下載、適用方案、商用權延續與Remix例外；不沿用舊的「生成時有訂閱就一律商用」簡化。美國著作權局立場清楚標明管轄範圍。
- Spotify事件：2026-10-20雙方官方公告；工具尚待推出、兩階段選擇參與、原作參與者權利金及原曲連結。售價、上線地區／日期、具體比例與控制條件不杜撰；不保證歌迷改編者分潤。
- 每篇引用原始資料與標示AIPOGER觀點；沒有MBW全文翻譯／轉載、外站圖片挪用或合作聯繫。本輪未新增排程或對外FB發文。

## 驗證與限制

- 定向32項通過，涵蓋三篇獨立正文／來源／metadata、首頁／列表三件、Sitemap、未知slug、PNG實際尺寸、新slug公開讀取與登入寫入限制。
- 全套885項：853通過／32選用略過／0失敗；TypeScript、本機webpack與Vercel雲端build通過。ESLint 0 errors／9筆原有img警告，新增TSX無警告；按React技能核對服務端正文、靜態匯入、可讀標題／圖說、外部連結及既有互動邊界。
- 待驗收站：兩篇四語320px無水平溢出，重點摘要位於封面之前；1440px標題／圖並排，封面實際載入。390px討論呈現登入提示，API公開GET 200、訪客PUT 401。
- 正式18項HTTP驗收全部通過：首頁／列表三篇、三篇SSR與正確OG／canonical／JSON-LD、兩張PNG 200且1200×630、Sitemap恰好三篇、未知文章404、兩篇討論GET 200及各自POST／PUT 401，以及探索／MV／登入入口200。
- 正式Chrome可見三篇列表與首頁卡片，新增封面正常；驗收當時部署error／fatal runtime log 0筆。未在正式站製造測試讚或留言。
- 社群平台是否重新抓取舊分享由其快取決定；本輪已驗初始HTML與圖片，未聲稱LINE／Facebook實際貼文已重抓。
- 本機Python urllib查核遇DNS失敗，改用curl完成同一組正式HTTP檢查；不是網站失敗，也未關閉TLS驗證。

證據：`/Users/huangyihong/Documents/New project/audits/2026-10-26-news-three-articles/`，包含來源判讀、測試與build日誌、部署前後識別、正式18項結果、四語排版與截圖。現行六份正文與索引已使用既有Drive ID原地同步，7份讀回逐位元組及SHA-256均相同（drive-verification.json）。
