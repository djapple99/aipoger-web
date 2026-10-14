# 盲聽8秒解鎖、可拖曳進度與回合HUD

2026-10-14，正式應用 `c20f7c4`，發布分支 `codex/homepage-mv-editorial`。Vercel `dpl_4Q9gXXNBLUZ96zWWm2oQEWHd5T8T` READY，先驗證staged production再promote到aipoger.com／www；雲端build完成33秒。

## 行為與延遲修訂

- 原先以server tick回傳解鎖，網路與初始play事件排隊可把8秒拖成10–12秒。前台現在用實際media進度和經過時間計數，8秒達標立即解鎖；伺服器仍按wall clock／進度限制並以精確8秒驗票，不採低於8秒容差。先確認server播放計時起點，再起播；Safari保留原tap媒體權限，等待、緩衝及快速跳秒不計聆聽。
- A／B各自0–7/8s提示。該側8秒前slider與重播停用；8秒後可在原歌15–45秒內拖曳／重聽。seek事件只重設位置，不能增加聆聽時間或干擾另一側正在播放。兩側達標才開放A／B／平手。
- 舞台內緊湊HUD依序显示準備播放、YOU READY?、聆聽中、LET’S GO開始評選、NEXT ROUND，沿用復古器材／黑底風格，保留三選擇單排、離開及成功自動新題。輕量動態遵循reduced-motion。
- A／B auto預備緩衝，瀏覽器自行決定下載量，沒有另存剪輯檔。Tick刪除一個重複question DB查詢；下一題catalog／seen／samples與目前驗票並行，完成發點才issue新pending。所有原公開資格、同曲風／不可自評、pair去重及一次3Credit保留。
- Supabase現有region為ap-northeast-1，原服務default為iad1。只將blind-listen及audio兩個API的function region指定hnd1；正式兩路由header `hkg1::hnd1`已確認，其他服務沿原region。未宣稱所有來源／冷啟動都無延遲；緩衝HUD明示尚未開始計時。

## 檢查

- 594測試：563通過、31既有可選DB略過、0失敗；21項blind runtime／API重點測試全部通過。延遲tick不拖住8秒UI、7.9未解鎖、8秒解鎖、假跳秒、等待不計時、A/B不重疊、30秒終止、重試不重發、準備不提前issue、candidate失效改用備選均通過。
- TypeScript、本機與雲端build通過；lint 0 errors／15既有warnings。發布後只修正test fixture變數命名的lint，不改應用bundle。
- `20261014051909_blind_seek_hud.sql`已實際套用Supabase；交易測試確認未滿8秒seek拒絕、seek不加時間／不影響另側、rebase後防快速跳秒、7.999拒絕／8成功、平手3點、重試與來源／credit權限，fixture／quota／所有測試收入完整回滾。
- Advisor前後維持21筆既有無policy INFO、14筆既有definer WARN、1筆既有Auth WARN；沒有新增WARN。

## 實際UI與正式站

隔離實際元件、真實原音訊及fake API：A8.323911秒、B8.338375秒時各側slider解鎖且三選擇可用。Home可拉回片段起點；A／B／平手答案runtime皆驗證。實際平手後自動新題，上一題3點提示保留，沒有Next操作；隔離fixture不寫正式票或Credit。

正式aipoger.com：初始兩側readyState4／currentTime15、8秒前slider與評選鎖定。A實際7.503661秒時仍未解鎖，B8.315950秒及A續聽至8.879882秒後全部解鎖；Home將A定位回15秒且無播放／留言錯誤。保留pending，沒有代使用者選偏好，0正式投票／0測試Credit。四語320px沒有水平溢出，console errors為空；1440×1024桌機、390×844手機實際截圖已存私人outputs。

正式HTTP：盲聽頁200、未登入blind API401、invalid audio ticket404、設備圖200。盲聽頁logo／全站導覽保留；狀態HUD未擋住play／seek／三選擇／Exit。

截圖目錄：`/Users/huangyihong/Documents/New project/outputs/aipoger-blind-release/`。`blind-hud-production-ready-desktop.jpg`、`blind-hud-production-vote-desktop.jpg`、`blind-hud-production-vote-mobile.jpg`。附加本機proof `blind-hud-local-vote-mobile.jpg`。不將私人截圖或.env上傳repo。

## 限制

首次冷啟動、來源及連線仍可能等待；服務region／重複查询／並行配對／auto緩衝已改善等待來源，載入不算8秒。一般iOS Safari未在實體手機額外測試，保留tap媒體啟動及native controls行為；本輪實播為Chrome桌機與手機viewport。登入15、20字評論10、增額投稿60及聖經2仍未啟用，正式Q／Drop／Showtime／MV規則未更動。
