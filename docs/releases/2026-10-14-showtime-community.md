# Showtime Choice／社群人物舞台改版

發布日期：2026-10-14 Asia/Taipei。應用 `b4e2efa`，發布分支 `codex/homepage-mv-editorial`。
Vercel `dpl_E7WZmgmGe3wc3TqABKEoN2czcvWF`，`https://aipoger-web-rnz8-hhdt8f7ws-yohungs-projects.vercel.app`，Ready並promote；正式`https://aipoger.com/rank?lang=zh`及新public API已核實。

## 最終行為

- 採使用者確認的融合稿：第二稿Choice主版面＋第三稿右側文字／三個Top5，原黑橘頂欄，桌機約70／30分欄。大封面旁保留原介紹，其他歌單緊湊排列，只有兩份時改封面／資料並排以減少留白。手機Choice先展示，下方同區切換樂評／創作／盲聽。
- 既有3份公開Choice全部保留，原封面／ID／策展人、10首曲序、完整頁與預覽HUD、原收藏／歌曲收藏／評論／分享及唯一共用播放器保持。精選／最新／最多收藏是歌單瀏覽順序，最新使用原publishedAt（缺少時weekStart），不是歌曲品質排行榜。
- 右側原句「每一份歌單，都是一個人的生活片段／在這裡，讓更多好音樂遇見更多人。」熱心樂評按近30天至少20個非空白字元、非作者可見評論的不同作品ID；音樂／MV同作品一次。活躍創作者按近30天原公開投稿ID；重送、MV連結、編輯／舊歌回歸不再加件。熱心評測者按完成且兩側各8秒、有原3Credit receipt的盲聽題，含平手。重试／未評／離開不算。
- 最多5名真實會員，按次數／最近有效貢獻／ID穩定排序，Owner也用相同計算；公開只回既有顯示名與彙總數，無email／帳號ID／私人Profile／Credit餘額或題目選擇。此次正式2位樂評、5位創作、1位盲聽會員，沒有虛構補位。本週台灣Monday週內目前無合格摘錄，使用真實空狀態；後續至多2首不同目前3個月曲庫的可見非自評摘錄。
- Showtime不再mount歌曲月榜或讀月榜API；原月榜資料、結算、歷史與Owner管理保留，舊anchor落於新策展區。About及SEO四語同步新方向。沒有改探索總分、正式Battle、投稿額度、評論限制／Credit發點、歌曲曝光／歸還名單，沒有挑20首、刪歌／刪檔或啟動清理排程。

## 資料庫／驗證

- Additive migration `20261014100235_showtime_community_stage.sql`已套用、版本與Supabase history一致；service-only SECURITY INVOKER、空search_path的read-only `showtime_community_summary()`與近期可見評論索引。無新增資料表／policy或開放private tables。Auth、票、曲庫與Credit不改。
- `tests/sql/showtime-community.sql`完整transaction rollback：20字門檻、同曲重評去重、自評／短評／隱藏／超過30天排除、隱藏投稿排除、平手8秒有效／7.9秒無效、Top5／摘錄上限、anon／authenticated不能execute。驗後0 QA users／works，原37評論／12完成盲聽與3份Choice保留；沒有真實評論／收藏／Credit測試寫入。
- 613tests：582pass、31既有optional DB skip、0fail；TypeScript、本機與Vercelbuild通過，lint0errors／15既有warnings。Security advisor前後同3類群組、無新增WARN。Public API實測只回有資格資料與可見collection comment counts；失敗503不填零或假資料。
- Browser實際播放有readyState4與持續增加的currentTime，原評論署名／10曲HUD／播放及收藏排序已核對；中英日韓320px均無水平溢出、手機人物榜切換正常、console error空。正式Owner頭像／後台待辦與私人工作台入口保留。手機僅viewport驗證，非iOS真機。
- 使用乾淨commit worktree部署，不複製環境檔／圖片／密鑰。先用保護部署public API驗證，再promote；正式新API200與真實聚合核實。設計QA位於root `design-qa.md`，source／Chrome畫面已同時比對，兩項P2（guest重複登入、少量Choice過大）修正後passed。

驗收圖在私人工作區 `outputs/aipoger-showtime/`；本機Turbopack dev對既有nested API產生404，改webpack及正式build檢查通過，正式站無此失敗。此限制不作為跳過真實頁面驗證的理由。
