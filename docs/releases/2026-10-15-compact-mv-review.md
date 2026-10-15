# 2026-10-15 MV 評價版面精簡

使用者於2026-10-15（Asia/Taipei）依正式站截圖要求精簡評論與支持視窗。應用提交 `5e79c27e78bca093f66f51c393f11e3619869f98`，分支 `codex/public-rule-copy`。

## 修改

- 移除影片下方獨立的「在 YouTube 開啟」，官方播放器及其YouTube來源入口保留。
- 愛心／收藏、支持說明與分享鍵收進同一列；手機愛心與分享並排，長說明緊接下一行，控制至少44px。
- 輸入分數旁合併小數提示與每人一分／可修改說明，減少評分區重複間距；歌曲共用視窗也沿用。
- 連播控制仍只在連播期間出現；播放器、評分、評論、Credit、公開署名、通知及原資料沒有行為變更，也沒有SQL遷移。

## 驗證

- MV rating／gallery／player／heart既有相關測試37/37通過。
- 全套666項：634通過、32既有可選DB略過、0失敗。
- lint：0 errors／14既有warnings。
- webpack正式build及其TypeScript檢查通過；獨立 `npx tsc --noEmit` 最終通過。首次獨立檢查遇到開發伺服器重建 `.next/dev/types` 的檔案競爭，停止伺服器並完成build後重跑通過。
- 本機MV discovery在現有測試環境回503，未將該畫面冒充視覺驗收；正式站呈現另行核實。

## 發布與正式驗收

Vercel `dpl_P2x4VeKoBGSeLLbHXTNaUKL5vf6A` READY，`aipoger.com`、`www.aipoger.com` 均已alias至上述SHA。

- 正式1440px桌機：愛心、說明、分享同列；輸入旁合併提示；dialog內沒有獨立YouTube外連。
- 正式390px手機截圖及320px中英日韓DOM寬度檢查：dialog與支持列的scrollWidth等於clientWidth，沒有水平溢出，提示文字完整。
- 已登入既有評論／8.2評分及公開舞台名稱正常顯示。未送出測試留言、按心或刪除真實評價。
- 正式console errors為空。播放器與連播由37項既有相關測試涵蓋；本輪沒有宣稱重新完整播放整個MV佇列。
- 版面證據：`production-desktop.png`、`production-mobile.png`、`mobile-locales.json`。

本機完整證據：`/Users/huangyihong/Documents/New project/audits/2026-10-15-compact-mv-review/`。
