# 2026-10-15 評分鎖定、評論一次修改與獎勵不追回

使用者於2026-10-15（Asia/Taipei）逐項確認後以「do it」授權執行。應用提交 `0c0d2a6e11696d8590436049004355eb05ade702`，發布分支 `codex/public-rule-copy`。現行規則以 product-rules 正文為準，本紀錄保存本輪變更與驗收證據。

## 本輪結果

- 歌曲／MV一般會員首次評分固定；文字評論可成功修改一次，會員不得自行刪除或另發主評價重置限制。相同內容重試、開啟／取消編輯、驗證失敗不消耗修改次數。
- 唯一Owner可不限次修改自己留下的文字與評分，並保有刪除評論權；沒有代改其他會員內容或自己作品自評的權限，公開說明不顯示Owner例外。
- 已發評論10 Credit不因修改、隱藏或Owner刪除追回；同人同作品不重複發點。首次有效評分＋20字及基本反灌水仍須通過，已獲獎的一般會員修改後仍須保留合格內容。原本未獲獎的短評修改後首次合格，可得第一份獎勵。
- Owner刪除以隱藏及管理紀錄實作，原評分關聯保留但退出公開彙總；一般會員不能再投來繞過鎖分。既有四參數edit RPC與integer舊評分RPC一併受新規則限制。
- Heart取消追回／恢復、既有欠額、初次反灌水、排行公式、正式Battle與其他留言系統未修改。未追溯補發獎勵或重算歷史欠額。
- 介面沿用緊湊黑橘設計；鎖定分數、文字剩餘一次及已用完狀態，只有本人Owner看到相應編輯／刪除操作。中英日韓文案與「這裡怎麼玩？」同步。取消修改還原原分數；早期無評分的文字評論也能使用一次修改。

## 資料庫

正式Supabase專案 `rwueinzgjaaefjvmsyem` 已依序套用：

1. `20261015153016_review_finality.sql`：修改計數、固定評分、編輯／刪除權限、獎勵不追回及舊RPC相容。
2. `20261015153213_review_owner_lookup.sql`：限定server查詢Owner身分的helper。正式驗收發現service_role不能直接讀取auth.users，因此以此加法式修訂改為固定空search_path的窄範圍SECURITY DEFINER；只回傳布林值，只有service_role可執行。沒有開放auth資料給會員。

寫入API以getUser驗證Bearer，再綁定會員ID；不接受前端Owner旗標。資料庫在會員鎖／資料列鎖內驗證一次修改，避免並行繞過。一般會員無直接更新評論／評分表或執行新RPC的權限。

真實正式資料的交易驗收腳本：`tests/sql/review-finality-production.sql`。在 `SET LOCAL ROLE service_role` 下驗證會員鎖分、不能刪除、第一次文字修改、相同重試、第二次拒絕、Owner連續修改自己的分數／文字、Owner刪除不追回獎勵；全程ROLLBACK，回傳 `review_finality_transaction_passed_and_rolled_back`。驗收修正了短評第一次變合格應發10點的原測試假設，未更動此正確產品行為。

回滾前後真實評分摘要hash一致（`247c88487ffaa2236e371d3517523d8f`），評論獎勵仍2筆／20點且hash一致（`b6974b55e35cb5d8b2674c61673ca9e5`）；修改計數大於0的真實資料仍0筆。沒有測試評論、分數、通知或發點留在正式站。

Security advisor前後完全相同：25筆既有service-only RLS無policy INFO、14筆既有authenticated definer WARN、1筆既有Auth弱密碼保護WARN；無新增WARN。這不是全站無警告的宣稱。

## 本機驗證

- 首輪相關API、React runtime、真實PGlite PostgreSQL測試22/22通過，補充取消編輯與無分數舊留言驗收後的完整測試亦通過；包含一般會員、Owner、舊RPC、跨歌曲／MV、匿名權限、重送、一次修改、短評首次領點與不追回。
- 全套673項：642通過、31既有可選DB測試略過、0失敗。以 `AIPOGER_CREDIT_PGLITE_MODULE` 啟用既有Credit及本輪SQL測試。
- TypeScript與webpack正式build通過；lint 0 errors／14既有warnings。
- 本機discovery仍是測試環境503，實際畫面改由正式站驗收，沒有冒充本機視覺通過。

## 發布與正式頁面

Vercel `dpl_ALjK7rZuguVQ4HLfdvy1wm47gVJz` READY；`aipoger.com` 與 `www.aipoger.com` 已alias到上述SHA。

- 已登入Owner原8.2分、原文字及公開舞台名正常；按「修改評價」後暫填7.1，取消後還原8.2及唯讀狀態。未送出真實修改或刪除。公開「這裡怎麼玩？」已顯示鎖分、文字一次修改、不得自行刪除、評論獎勵不追回，沒有Owner例外文案。
- 正式390px手機：修改／刪除按鍵44px，dialog寬度349px且沒有水平溢出；原支持說明／分享同列及緊湊間距保留。
- 320px中英日韓四語dialog寬度279px、scrollWidth皆279px，沒有水平溢出；console errors為空。
- 一般會員限制以API／React runtime和正式資料庫交易驗證；未另登入真人一般會員帳號或代其發表。

完整本機證據：`/Users/huangyihong/Documents/New project/audits/2026-10-15-review-finality/`。包含targeted-final.log、targeted-ui-final.log、tests-final.log、lint-final.log、build-final.log、typecheck-final.log、production-owner-desktop.png、production-owner-mobile.png及production-mobile-locales.json。手機為Chrome視窗尺寸驗收，未宣稱iOS真機驗收。

本輪現行產品／體驗／工程／索引已同步本機正本，私人agent與roadmap已更新；六個有改動的Google Drive既有ID原地更新並讀回新規則／應用SHA確認。沒有建立新主文件或重置其他工作區程式變更。
