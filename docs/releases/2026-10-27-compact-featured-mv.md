# 首頁精選MV：簡潔又有力的版面

2026-10-27（Asia/Taipei）使用者確認demo並要求納入以後的設計規範、開始修改網站。固定設計正文位於`aipoger-experience.md`的Visual Language；本report只保留實作與驗收證據。

## 已確認版面

- 標題與副標桌機同排；左側影片下集中評論、YouTube、頁碼與前後切換，與右側橘色觀看CTA共用基線。
- 作者下方整合真實平均分／10、評分人數及獨立週支持，點評分進原評論／評價；無評分和讀取失敗分開呈現。
- 收斂標題與評論區密度、探索區向上，手機自然換行並維持44px操作。原封面、播放、評論、四語與限時推薦保留。
- 已確認demo：私人驗收目錄`/Users/huangyihong/Documents/New project/audits/2026-10-27-compact-featured-mv/approved-demo.png`。示範數字不直接寫進產品。

## 實作

- 首頁專屬CSS grid兩列：影片／作品資訊、次要操作／主要CTA；不影響MV主頁與其他共用樣式。
- 首頁discovery接原`work_rating_summaries`公開彙總，只補入目前推薦作品，不新增資料表或寫入。彙總失敗保留首頁，欄位未知不當成零；空推薦不查分數。
- 播放中的作品保留原iframe，背景評分更新可顯示最新分數；評論視窗沿同一作品ID，原播放狀態與草稿行為保持。

## 驗證與發布

待正式驗收後補齊。
