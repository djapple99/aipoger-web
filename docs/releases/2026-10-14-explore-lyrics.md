# 探索封面歌詞與點外收合

2026-10-14，正式app `567ce28`、`codex/homepage-mv-editorial`。Vercel `dpl_7uAYD1ktw42T3SR7ESvGWby5uy3L` READY；從乾淨的567ce28發布checkout以production --skip-domain構建、保護環境驗證Explore，再promote至aipoger.com／www。雲端build完成35秒。

## 改動

- `/ai-music`推荐、曲風及升溫共用歌曲卡，把「顯示戰績資訊」與BATTLE RECORD換成文件圖示「顯示歌詞」，旁邊分享及原封面播放保留。前台不再維護多個expandedHud，正式Battle資料／資格／接戰同意及排行照原路徑運作。
- LyricsPopover讀同一原作品lyrics、creator、title，不需要登入，不啟動播放或另開播放器。既有換行保留，沒有內容顯示「歌詞未提供」；影片中的After the Last Coffee（純音樂）和正式Smoke Over Tokyo（純音樂）已核對這個狀態。
- 單一native auto popover支援點外、同鍵、Esc與另一歌詞入口收起；useId避免同作品出現在推荐／分類時的DOM ID重複。獨立捲動、44px關閉鍵與焦點返回原鍵；內部捲動／選字不收起，頁面scroll／resize收起。黑橘面板及橘色捲軸，在viewport內按入口位置展開，不增加作品操作列。
- 舊瀏覽器fallback具備點外／Esc，樣式獨立於原生pseudo selector。未在實體舊瀏覽器另行實播；本輪UI檢查使用Chrome。
- GlobalMusicPlayer原歌詞dialog加入點外幾何判斷；文字及dialog内padding點擊不誤關。點外關閉後音訊仍持續，關閉播放器仍正常停止；原Escape和關閉按鈕保留。

## 驗證

594 tests：563通過、31既有可選DB略過、0失敗。原卡片測試加入原作lyrics identity檢查，舊Explore必須畫W/L的source assertion改為保留真實backend戰績資料；其他正式Battle規則測試保留。TypeScript／本機build通過，lint0 errors／15既有warnings；雲端正式build通過。没有SQL、Auth、Credit或環境設定變更。

本機與正式站桌機／手機驗證：只有一個歌詞面板；按搜尋框能在同一次點擊收起並聚焦；切另一首收起前一首、Esc、關閉鍵、內部PageDown、空歌詞均可操作。打開歌詞不啟動音訊。正式底部歌詞點外後關閉，播放器仍持續；之後明確關閉播放器停止。四語本機及正式站320px無水平溢出、console errors空；正式四語點外收起皆回到0個popover，桌機／390px手機同樣正常。

正式HTTP Explore200。实际截图保存私人目录 `/Users/huangyihong/Documents/New project/outputs/aipoger-explore-lyrics/`：`lyrics-production-desktop.jpg`（推薦純音樂缺詞）、`lyrics-production-desktop-full.jpg`（完整歌曲歌詞）、`lyrics-production-mobile.jpg`（手機）。截图不提交repo。沒有提交Heart、評論或Battle偏好，只進行實際播放與讀取檢查。

## 後續

接受挑戰／邀請挑戰的呈現方式另列roadmap，待使用者確認；此次不改其正式規則或自動替創作者開接戰。
