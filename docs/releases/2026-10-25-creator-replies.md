# 播放器還原與創作者回覆發布驗收

2026-10-25 Asia/Taipei。使用者確認恢復原本上下播放器、歌曲保留有內容的歌詞，新增作者回覆與每則首次2 Credit；明確取消每日與總額獎勵上限，授權完成測試及部署。

## 發布

- 應用 `5bb0fcc74ad4e7af95a8e465c80a2de0294deda0`／`codex/public-rule-copy`，已push。
- Vercel `dpl_5jTGr5TXuSmZ9sHvreh1KZoXbJ6E` READY；production環境先skip-domain驗證，再promote同一build，aipoger.com／www均綁定。
- 繼承前輪`b8cc6d1`的公開HTML、canonical／hreflang、Sitemap、OG／Twitter與會員聖經限制；沒有還原這些架構修復。

## 行為

MV與外站播放視窗恢復最大880px的上下單欄，影片、評分、評論共用可捲動區；移除影片左下空洞與固定左右欄。手機鍵盤只改可視尺寸，播放器不隨打字／儲存重建；回覆送出忙碌狀態併入既有連播保護。歌曲已提供歌詞可從作品／評論區開啟；MV不另外顯示歌詞區，空歌詞維持收合。

回覆接在原評論下面，顯示已儲存舞台名；只有作品所屬投稿帳號能回覆，不靠歌手顯示名或Owner權限冒認其他作品。每則不同他人原評論首次回覆+2，無每日／總額上限；同則後續交流不再發點。短回覆可送出，不套用原評分評論的20字條件，最多280字。自己留言、隱藏原評論／作品、匿名或錯誤帳號不能領點。舊Storage-only留言保留展示，未有可驗證會員身分者不提供獎勵回覆。

新回覆表不改原評論／評分，不參與人氣或盲聽排行；永久獎勵receipt與回覆分開，刪除／隱藏／重貼不重領、不追回已得2點。回覆、首次發點、idempotent request與原評論者通知同交易。回覆收入透過原`creator_credit_history` security-invoker view併入餘額，原欠額先補足。通知沿既有私人三則／保存期限規則，連結定位原評論串。

## 資料庫

新增本機migrations：

- `20261024192722_work_creator_comment_replies.sql` → 正式ledger `20261024193944`。
- `20261024194035_work_reply_service_auth_boundary.sql` → 正式ledger `20261024194233`。

兩者均已apply並讀回核對。新增回覆與獎勵表皆RLS、service-only grants；新RPC為SECURITY INVOKER，anon／authenticated不能直接執行。正式service_role不具auth.users SELECT，後續boundary migration明確使用API既有auth.getUser會員驗證，不新增Auth資料讀權。原Credit及評分summary函式hash發布前後不變，沒有舊資料補發／重算。

## 驗證

- 全套793項：762通過、31既有選用DB略過、0失敗。使用PGlite 0.5.11執行真實SQL，含原Credit／review-finality回歸。
- 首次回覆、相同request重送、同則新request、刪除／隱藏、無限額100則不同評論共200點、自己／錯作者／錯作品／匿名／不公開、private grants、舊評分不變、通知失敗整筆回滾及欠額補足皆通過。
- TypeScript、webpack正式build與雲端build通過；lint0 errors／14既有warnings。清除本機臨時QA頁的舊dev generated types後重新typecheck通過；QA頁與假登入僅在隔離環境，發布source中不存在。
- 隔離瀏覽器：實際YouTube播放時打字／送出作者回覆，iframe ID／src保持相同；第一則+2、同一評論後續0，兩則回覆總共2點，原評論／9.1示意分保留。歌曲歌詞實際可展開；1440px單欄880px、四語320px無水平溢出。
- 正式資料庫在transaction內以既有公開評論核對首次2、重試同結果、後續0與原Credit增加2，整筆ROLLBACK；核對0測試回覆／0獎勵保留。沒有對真人送出測試評論、評分或公開回覆。
- 驗證部署work／新API200、未公開404、匿名POST401；正式端點重新讀取200、Owner可見兩則評論下的回覆按鈕，空白回覆表單展開後取消，未送出。指定作品`7c9ed1cb-073f-4d03-8366-7e73454ad708`原兩則評論與10.0／2人評分API逐項一致。網域切換初期舊節點一度404，別名完成後重驗已200。
- Supabase安全advisor發布前後無新增WARN；最後部署未見error／fatal runtime紀錄，正式瀏覽器console errors為空。
- 私人截圖與隔離紀錄：`/Users/huangyihong/Documents/New project/audits/2026-10-25-creator-replies/`。手機為瀏覽器尺寸驗證，非iOS真機。
