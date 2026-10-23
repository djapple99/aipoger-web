# Battle三模式分享鍵與專屬縮圖

使用者確認日期：2026-10-23（Asia/Taipei）。

## 實作

- Battle首頁的盲聽、Q Crash、Drop Battle標題旁各加入44px分享鍵；既有標題列與三模式順序保留。
- 分享正式網址帶當前語言、模式與對應入口錨點；延遲掛載及Drop挑戰池載入中也能定位，沒有傳入場次／登入／私人參數。
- 每模式各用既有復古器材插畫製作1200×630 PNG：A/B隨身聽、雙卡帶、取樣機／混音器。圖片提交為靜態資產，社群爬蟲無需JavaScript或即時生成圖片。
- Battle頁拆成伺服器metadata入口與原client頁。Open Graph、Twitter及canonical以mode區分；四語替代連結保留模式。直接分享盲聽內頁也使用盲聽圖。Q Crash的ja／ko分享文案沿用英文回退。
- 分享沿用共用ShareButton的原生選單、複製、取消與手動連結處理。沒有修改票數、Credit、盲聽匿名內容、個別對戰分享、DB或Auth，未自動發表社群貼文。

## 驗證

- 39項相關測試通過，包含四語三模式的預覽／canonical／錨點／實際按鍵props、無效模式與私人參數排除、PNG尺寸、Q Crash語系政策、既有原生分享／取消／複製回退及Battle契約。
- 完整697項：664通過、33項既有可選DB測試略過、0失敗。TypeScript與webpack正式build通過；lint為0 errors／14項既有warnings。
- 本機桌機與390px、320px中英日韓版面無水平溢出，三分享鍵均44px。原生分享與取消由既有runtime測試驗證，未使用iOS真機。
- 本機既有資料環境的挑戰池／Q Crash API無法讀取；這次模式metadata及靜態資產不依賴資料庫。正式站以真實官方關卡載入後再驗收。
- 正式Facebook爬蟲User-Agent逐一通過16組metadata：四語×三模式與四語盲聽內頁。OG／Twitter圖片一致，canonical／og:url正確，metadata在HTML head；三張PNG均回200、1200×630，內容與提交資產完全相同。
- 正式站三個分享鍵實際複製出各自的介紹、語言與模式連結，均顯示成功。正式桌機與390px手機無溢出、按鍵44px，Drop深連結載入後定位至入口；console errors為空。
- 正式首頁、Auth、Battle建立入口、www Battle及原MV範例回200；原MV仍提供自己的YouTube封面。

## 正式發布

- 應用：`c245e7d7b5eff3f085e3d9400292e16dcdd526fb`，分支`codex/public-rule-copy`，已push。
- Vercel：`dpl_3zTxN9dLH8HKLW4JxbVHT1P2TLbM`，READY，aipoger.com與www綁定同版。
- 繼承MV作品專屬預覽`0791814`及既有正式規則。社群平台已有快取需由平台重新抓取；本輪驗收不宣稱舊貼文快取已清除。
- 私人驗收資料：`New project/audits/2026-10-23-battle-mode-sharing/`；截圖、HTTP核對結果及工具log不提交Git。
