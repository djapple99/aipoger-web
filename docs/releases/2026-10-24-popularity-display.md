# 人氣榜評分與收藏分開顯示

2026-10-24正式發布，Vercel READY；aipoger.com與www均綁定本次SHA。

- 應用提交：`9b3236e63b6d008d86eaf4679600a5ac3311b78f`；分支`codex/public-rule-copy`。
- Vercel：`dpl_91yTRNjHBDtrG7bNoPVHacX5yKbJ`，正式目標，READY／無alias錯誤。
- Top50沿既有人氣公式排序，移除31.0等混合積分。榜單與探索卡顯示平均／10、有效評分人數與實際去重收藏人數；未評分不補零。
- 收藏從既有私人Storage只讀下載，按原作品ID合併會員集合，沒有DB遷移或新寫入；只公開總數，失敗標不可用、不冒充0人。此數字不額外加入排行公式。
- 一般會員評分鎖定、Owner自身評分可改、原評論／Heart／盲聽／Credit／新歌與回歸加成不變；未採用先前本機可信度試排。
- 本機755測試：722通過、33既有選用DB略過、0失敗；TypeScript、webpack正式建置通過，lint0 errors／14既有warnings。
- 桌機1440px及手機320px四語無水平溢出；手機3首預覽／原頁展開50名通過。渲染使用正式公開資料快照與唯讀本機proxy，未向正式站發表測試評論、收藏或投票；本機服務金鑰失效，未替換或匯出金鑰。
- 本機證據：`/Users/huangyihong/Documents/New project/audits/2026-10-24-popularity-display/`。

## 正式驗收

- `/`、`/ai-music?lang=zh`、`/mv?lang=zh`、`/auth?lang=zh`、`/battle/setup?lang=zh`及公開曲庫API全部HTTP200。
- 259件公開曲目收藏彙總均可用；208件可排序作品，以相同時間重算，名次、人氣分與改前完全一致。
- 《阮袂認命》顯示9.5／10、2人評分、4人收藏；《水逆快走開》顯示9.0／10、1人評分、2人收藏。原人氣內部值31與17.25保留，已不當作作品評分展示。
- 正式四語320px皆無頁面水平溢出，手機預覽3首／展開50名正常；桌機1440px可讀，console errors空。原作品按心與評論入口保留，未使用正式會員資料進行寫入測試。
- 證據：`production-desktop.png`、`production-mobile.png`、`browser-qa.json`、`http-qa.json`與`ranking-qa.json`位於上述私人本機資料夾。API只新增收藏數彙總，沒有回傳favoriteUserIds／favoriteSavedAt。

固定正文、私人協作入口／待辦與雲端索引已同步既有Drive ID，六個更新目標均讀回確認；沒有新增雲端副本。
