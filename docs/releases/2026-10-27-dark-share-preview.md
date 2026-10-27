# AIPOGER 黑底白 Logo 分享預覽

確認日期：2026-10-27（Asia/Taipei）。使用者提供白色透明Logo，要求網站分享的品牌畫面改為黑底白字。

## 實作

- 原預設OG為白底黑Logo的`/aipoger-og-card-20260522.png`。新增1200×630實心黑底PNG，保留提供素材的白色符號與字標及原比例，不重新繪製商標。
- `AIPOGER_SHARE_IMAGE_PATH`集中管理`/aipoger-og-card-dark-20261027.png`；root layout及publicMetadata的Open Graph／Twitter共用新圖，無封面的作品／Choice品牌回退同源。
- 專屬MV、單曲、新聞、教材及歌單已有封面時仍沿原內容。舊圖URL保留相容；新圖版本化避免圖片URL沿用舊快取，但不宣稱能自動更新已發社群貼文的預覽。
- 沒有頁面布局、作品／評論、Credit、排行、Auth或DB／migration修改。繼承`56825bf`的電台自動播放及先前全部正式功能。

## 驗證

- 32項分享／SEO定向測試通過，包含四語metadata、作品ID／canonical、單支MV及Choice原封面不被預設品牌圖覆蓋。
- 全套932項：893通過、39既有選用略過、0失敗；TypeScript與webpack正式build通過，lint 0 errors／9既有warnings。
- 本機已查看實際成品，黑底白Logo、沒有透明底；原素材未覆寫。

## 發布

應用`4acfd8bdb03a9662295bb6733bf607ae1dd3e3ed`／`codex/public-rule-copy`。Vercel部署`dpl_CAANdf6Et3wotnFC4HbKaSa6g7nG`／production／READY；aipoger.com及www均綁定同一SHA，雲端build通過。

- 正式24項HTTP檢查通過：首頁／探索／MV／Showtime四語共16頁均回新品牌圖片；Battle四語保留原盲聽器材圖，首頁以Facebook／Twitter／LINE的crawler User-Agent另驗3項，圖片本身1項。
- 各頁Open Graph及Twitter圖片一致；品牌圖標示1200×630，正式PNG為52205 bytes，與本機成品SHA-256完全相同。實際影像為不透明RGB、四角5／5／5近黑、白Logo像素255。
- 本輪是直接核對網站HTML與實際圖片，沒有登入社群或代發貼文，也沒有聲稱已觸發Facebook／LINE既有貼文重新擷取。已發貼文仍可能使用平台快取，需由平台重抓。
- 私人證據保存在`New project/audits/2026-10-27-dark-share-preview/`：24項結果、正式下載圖片、來源及成品hash。素材來源為使用者提供的`aipoger 黑底白logo.png`，原檔不變。
- 體驗正文、工程、固定索引及協作入口同步既有Drive ID；無需SQL或人工部署步驟。
