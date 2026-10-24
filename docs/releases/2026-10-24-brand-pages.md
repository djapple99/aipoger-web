# 關於愛播歌與廣告合作新版發布 — 2026-10-24

使用者已選定兩張設計稿並授權測試後直接部署；Drop Battle 規則維持原狀。

- 應用：`555b5291bee31aec3d8406cfda889f3e43c4890e`，`codex/public-rule-copy`；基準 `1ac5500`，繼承正式 `02180e1`。
- Vercel：`dpl_BqduXPi2ESjXsLozsXmGqNg84FdY`，READY，production；apex／www均綁定此部署。部署網址 https://aipoger-web-rnz8-c8qa2qk61-yohungs-projects.vercel.app 。
- 正式入口：https://aipoger.com/about?lang=zh 與 https://aipoger.com/partners?lang=zh 。

## 結果

關於頁使用自然光黑膠唱盤大圖、平台使命三欄及三組原生可展開政策。原中文／英文授權、下架、聲明與聯絡文字、列點和連結逐項相等核對；日韓法務正文仍沿既有英文回退。合作頁使用確認的女生耳機／唱片俯拍主圖，三列合作項目可展開並帶項目主旨寄信；下方混音台聯絡橫幅與正確商務信箱保留。首頁導覽、語言、登入返回與頁尾互連沿原站功能，移除本兩頁的重複浮動登入／語言／首頁及現場人數覆蓋。

三張獨立攝影風格生成圖總計519716 bytes WebP，使用Next響應式圖片；首屏優先、底部圖片延遲載入。未將Pinterest參考或先前素材庫人像直接用作正式圖片。

## 驗證

- TypeScript及本機webpack正式建置通過；雲端正式建置READY。
- 全套750項：717通過、33既有選用DB略過、0失敗。lint0 errors／14既有warnings；新檔targeted ESLint通過。
- 桌機1159px內容比對確認稿，完整頁及文字／CTA裁切並排檢視；修正舊浮動UI重疊、主圖裁切、標題比例及英文Grid自動最小寬度。最新design-qa.md為passed。
- 四語桌機與320px：兩頁scrollWidth均等於clientWidth；390px中文手機圖文／按鈕可用。手機為視窗模擬，非iOS真機。
- 原生說明列滑鼠點擊、Enter展開、下架通知與聲明保留、合作帶主旨mailto、語言切換與導覽目的地核對。只檢查郵件連結，未寄送郵件。
- 正式兩頁與三張圖片HTTP200；apex／www HTML包含新部署標記，首頁／登入／Battle／Drop規則路由HTTP200。正式中文手機無橫向溢出與壞圖，正式下架說明與頁尾互連實際操作確認。
- 正式頁console無應用錯誤；本機開發時有既有Logo比例warning及編輯CSS觸發的Next HMR removeChild暫時錯誤，雲端正式版不含該HMR路徑。

本次無SQL／Auth／Storage設定／歌曲／留言／評分／Credit或Drop Battle規則變動。global-battle-call-overlay僅增加兩條資訊頁路由來避免訪客重複登入按鈕；沒有修改對戰或投票邏輯。主工作區既有未提交變更未打包。私人圖稿與截圖位於design-demos/2026-10-24-about-partners及audits/2026-10-24-brand-pages，未提交環境檔或截圖。
