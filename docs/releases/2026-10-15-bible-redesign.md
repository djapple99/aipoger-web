# 創作聖經四色學習路線發布紀錄

確認與發布日期：2026-10-15（Asia/Taipei）。使用者選定黑底四色路線稿並以「好～do it」授權實作／發布。本 report 提供證據，產品與體驗正文是現行規則；未有新的使用者指令，不得改回舊五入口或重新展開整本長教材。

## 發布版本

- 應用 `68785600763879d3d8e8bde56bdf0935a7757920`，分支 `codex/public-rule-copy`；繼承 `6d76764` 電台／投稿與既有Credit。
- Vercel `dpl_7rPqErjZbvMsNiQqWUBbrrP3Vmk8`，production READY；`aipoger.com`、`www.aipoger.com` 已指向該SHA。
- 由既有專案Git連線發布精確commit，未上傳本機環境檔。無SQL、Auth、Storage、Credit數值或排行榜修改。

## 已完成

1. 共用黑橘導覽、精簡標題、全書搜尋／分享；橘綠紫藍四路線依序為第一首、找風格、改善作品、完成發表。
2. 入門三招先呈現Style／Lyrics分工、七格聲音DNA、副歌情緒；按鈕展開原教材，不複製第二套內容。
3. 常用招式四分類、直接複製真實catalog內容；卡關捷徑、影片教學及LINE實測討論集中右側。手機2×2路線與直向課卡，複製鍵44px。
4. 完整內容改為五個收合章節，保留原ID、搜尋、評論、複製、台語實測及Mastering十五秒共用播放器。重複錨點可重新開啟，索引搜尋字詞能跨延後載入保留；載入失敗顯示重試。
5. 教材第五步撤下已退役Showtime月榜字樣，改為策展／創作者與Choice。未新增聖經扣點、熱門數字或學習完成數。

## 驗收

- 647項測試：615通過、32既有可選DB略過、0失敗。新增runtime涵蓋收合後同錨點再開、真實catalog分類／完整複製、失敗重試。這次沒有更改資料庫，不宣稱略過的DB測試已執行。
- TypeScript、webpack正式build與Vercel build通過；lint 0 errors／14既有warnings。
- 本機瀏覽器測試使用短暫開發fixture呈現實際元件與既有資料；部署前全部移除、恢復原會員頁。正式fixture URL 404，匿名content API 401；正式會員載入163招正常。沒有把fixture或會員資料改成公開入口。
- 本機實測複製全文、分類、招式與副歌範例展開、DNA搜尋、15秒音訊進度11.15秒與共用播放器。
- 正式會員頁搜尋「七格」直接顯示對應招式；手機分享剪貼簿讀回固定`https://aipoger.com/ai-music-bible?lang=zh`。中英日韓390px無橫向溢出（client=scroll=375），320px也為305=305；日韓會員英文回退維持原規則。公開入口四語、首頁、Auth、Explore及實際試聽資產HTTP200。
- 正式Chrome console error清單為空。未做實體iOS／Safari測試；本機擴充套件注入屬性曾造成開發hydration提示，正式站無此錯誤。
- 截圖與HTTP證據：私人工作區`audits/2026-10-15-bible-redesign/`；正式桌機`production-desktop.png`、手機`production-mobile.png`。設計比對與迭代見repo根目錄`design-qa.md`（passed）。

## 文件與邊界

本次更新現行產品規則、體驗正文、工程基準、索引與私人協作入口，維持固定檔名與既有Drive ID原地同步。四路線替代舊五入口；原教材及會員保護保留。沒有啟用聖經2點解鎖或其他新點數規則。
