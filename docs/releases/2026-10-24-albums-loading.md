# 專輯分區、投稿與載入優化驗收

2026-10-24 Asia/Taipei。產品規則與流程分別以現行產品正文及體驗正文為準；本檔保存實作／驗證證據。

- 應用：`317331c0afa92dde369f793f60abc67edcfe4ec4`，分支`codex/public-rule-copy`。
- 正式：Vercel `dpl_HDBZnYxRjh7mrZiJyvfyyqzbQgBZ` READY，`aipoger.com`／`www.aipoger.com`已綁定。
- 功能與初次正式驗收版本`4aac710`；最後版本追加六個資料API的東京區域設定，沒有改動產品規則。先以Production設定、skip-domain建立獨立待驗收版本，正式API回讀正確後發布；未關閉Deployment Protection。本機既有環境金鑰過期，沒有換成明文正式密鑰，本機建置／單元測試及正式環境驗收分開記錄。

## 功能與資料

Explore新增專輯模式，支援完整合輯連結／音檔，以及本人2–50首既有單曲排序建立專輯。新的album分類保存原作品ID；單曲曲庫／Top50、評分彙總、盲聽配對、首頁單曲與保留月榜均排除專輯。專輯留言與愛心沿原紀錄，沒有數字評分欄；MV保留可播放條目並標示專輯。中英日韓指南加入內容分類，沒有單純以片長下架的門檻。

正式遷移已套用，檔名與Supabase歷史一致：

- `20261024070956_album_classification.sql`：加法式作品類型與曲序欄位、insert/update驗證、一般客戶端分類不可改寫、score及review RPC防線、評分彙總／盲聽排除。
- `20261024071251_album_single_chart_eligibility.sql`：月榜的公開單曲資格採現行分類，歷史快照原列不重寫。
- 單支轉類另存`supabase/operations/2026-10-24-classify-compilation.sql`，不硬編碼於通用schema遷移。

已轉類作品：`95450736-b981-442a-9da5-6eb9bf49097e`，〈夢を描き始める場所 (グランドフィナーレ)〉，YouTube `8sNY25QdMFA`，影片24:24。原6:31音檔、封面及2026-09-17投稿時間保留，專輯播放使用完整影片。交易前後以完整資料列hash斷言核對4筆評分、3則留言、47筆歷次reaction、4筆收據，以及所有Credit相關流水／award／文字查重紀錄均相同；47筆是歷次記錄，不是47位不同支持者。既有`updated_at`觸發器會記錄本次維護時間，原`created_at`和其他作品欄位保持一致。第一次嚴格斷言因updated_at差異攔下並回滾，確認差異後以明確白名單允許該維護欄位，重跑保存斷言成功才提交。

## 測試

- 完整709項：676通過、33既有選用DB測試略過、0失敗。
- TypeScript及本機webpack build通過；雲端Turbopack build READY。Lint 0 errors／14既有warnings。
- 實際Supabase交易測試：authenticated角色有序選曲、重複／巢狀／別人作品拒絕、一般角色不可轉類；原評分保留、album新評分與改分拒絕、單曲仍能評分、專輯可留言、anon公開播放與service-only grants。全部回滾，fixture residue為0。
- Security及performance advisor沒有新增WARN；performance新增一筆剛建立的`listen_bar_album_catalog`未使用索引INFO。既有WARN數量維持不變，[未使用索引說明](https://supabase.com/docs/guides/database/database-linter?lint=0005_unused_index)。
- 正式HTTP：單曲catalog無該ID；album catalog同ID／videoId／1464秒，舊短音檔未被拿來替代完整影片；MV條目album標記、評分0；review API回canRate=false。四語OG圖為該MV可用封面，canonical保留專輯ID。
- 正式瀏覽器：桌機MV實際播放來源正確，原3則留言可讀，無單曲評分欄；390px手機專輯卡片；320px中英日韓無水平溢出，未點播放時iframe數為0。
- 真正已登入的Owner創作者中心：專輯CTA預選類型，三種來源可切換，選兩首自己的作品及交換順序成功；未按發布，沒有留下測試專輯或扣點。限額／所有權／冪等／拒絕路徑另由API runtime與正式SQL驗證。

## 載入量測

使用相同機器的HTTP量測；舊版為本次修改前一次取樣，新版API為三次取樣中位數。不是實驗室LCP，也不代表每位使用者固定加速倍數。

| 指標 | 修改前 | 正式新版 |
| --- | ---: | ---: |
| Explore資料請求 | 4.323秒 | 1.132秒 |
| MV資料請求 | 3.354秒 | 0.521秒 |
| 專輯資料請求 | 新功能 | 0.228秒／724 bytes |
| 首頁初始JS（未壓縮） | 1,065,555 bytes | 1,037,181 bytes |
| Explore初始JS（未壓縮） | 1,155,907 bytes | 1,139,856 bytes |
| MV初始JS（未壓縮） | 1,107,708 bytes | 1,101,260 bytes |
| Profile初始JS（未壓縮） | 1,324,292 bytes | 1,159,704 bytes |

探索心數分批讀取、生命週期、評分與盲聽彙總改為並行；MV來源與評分讀取並行；六個資料API移到hnd1靠近ap-northeast-1資料庫。MV／探索／專輯資料仍使用最新資料與失敗回應，沒有用過期分數偽裝加速。專輯模式不讀取整份單曲清單。評論、裁切及投稿工具拆分按需載入；非優先MV卡片使用同影片較小尺寸縮圖，下方曲風區延後繪製。

本機驗收證據位於`/Users/huangyihong/Documents/New project/audits/2026-10-24-albums-loading/`：baseline／production HTTP JSON、區域回讀、轉類hash證據、桌機與手機截圖、四語尺寸結果；不將私人中心截圖、金鑰或工具暫存提交GitHub。
