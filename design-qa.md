# Battle 與盲聽設計驗收

final result: passed

## 比對來源與狀態

- 來源主頁：`/Users/huangyihong/.codex/generated_images/01a11410-a7ad-7352-bd36-4ff0b48ba73f/exec-3064c547-4040-4f7d-be43-f94d00d6073a.png`。
- 來源內頁：同目錄 `exec-8317403d-f31d-48f8-a7f9-6ed35dd2671d.png`。
- 實際實作：`http://localhost:3112/battle?lang=zh`、`/battle/listen?lang=zh`。
- 截圖目錄：`/Users/huangyihong/Documents/New project/outputs/aipoger-blind-release/`。最終主頁 `local-landing-desktop-final.jpg`、內頁 `fixture-room-desktop-final.jpg`、手機 `local-landing-mobile.jpg`／`fixture-room-mobile.jpg`。
- 來源1487×1058px，桌機實作1440×1024 CSS px／截圖px，密度1，比例皆約1.406；按0.968比例比較內容，未含瀏覽器邊框。來源与最終截圖放在同一次工具輸入成對檢視，未宣稱拼圖式並排。
- 主頁實際無Q Crash場次，保留一行空狀態，因此Drop區比概念稿多約44px偏移；不是多餘留白。內頁隔離fixture使用實際React元件與公開原音訊，模擬登入、題目及投票回應，沒有更改正式Auth或留下正式投票／Credit。概念稿可選狀態與fixture聽完後未選狀態比對；實際guest登入提示另驗收，不把未登入 disabled 誤判為缺失。
- 手機390×844與320×812 CSS px；中英日韓兩頁document scrollWidth等於viewport，沒有水平溢出。

## 比較歷史與修正

1. [P2，已修正] 主頁徽章與開始按鈕擠同排、主要標題偏小：按鈕改獨立flex，58px標題，縮短標題列。最終主頁截圖確認主次清楚。
2. [P2，已修正] 全域guest登入入口重複：新兩路由保留Editorial Header入口，移除overlay重複登入。guest DOM確認只保留正常頂欄及必要操作登入提示。
3. [P2，已修正] 內頁底部純黑區缺乏空間感：使用原插畫桌面下緣。首輪重複露出播放器，改200%背景裁切取桌面，最終1440×1024截圖確認沒有重複設備。
4. [P2，已修正] 手機長語系標題與reward可能相撞：title可換行，入口reward使用正常文流。四語320px實際DOM及390px截圖確認單排A／平手／B和文字可讀。

## 五項必要表面

- 字體：沿用全站sans與繁中字型fallback；重標題、一般操作及較輕說明層級清楚。沒有為插畫烘焙UI字。來源標題光學尺寸／原logo字型未完全等同，列P3；文字皆真實HTML且可選取、翻譯。手機文字自然換行。
- 版面：全寬工作室＋三模式順序保留，盲聽雙欄和三個選擇單排，Next置右。手機按鈕至少44px高；主播放與三選擇實測54px以上，窄屏不隱藏主要選擇。桌面選擇區68px，沒有新增表單排。
- 顏色：深灰藍基底、暖橘主要CTA、薄荷Q Crash CTA、深色介面維持整站黑底； disabled／selected、focus-visible可辨。沒有白色大面积底或全黑空洞。
- 影像：四張WebP插畫為生成的真實raster，無手繪CSS／SVG設備替代。設備、檯燈、桌面裁切、銳利度及壓縮可接受；手機仍能區分A／B。標準Lucide功能icon／文字VS為實際UI，非插畫替代。原作品封面只在投票後顯示。
- 文案：獨立可用的短行為語，30秒／第15–45秒、平手也3點、排名影響、登入返回路徑一致。未混入設計提案、工程流程或未啟用登入／評論／投稿扣點承諾。

## 操作與證據

- 主頁開始盲聽直接進`/battle/listen`；返回、Q Crash建立、Drop挑戰、規則及對戰記錄連結保留真實路徑。既有Q／Drop對戰卡及官方關卡保留。
- 隔離瀏覽器實際播放A與B，各原歌15–45秒，audio paused=true且currentTime=45；單一audio切換，不與全站播放器重疊。
- 平手後3點提示、揭示兩首真實原作品與前往支持／Creator Center入口可见；此為fixture UI測試。實際原子發點、retry不重發、同一pair交換A/B不重發、own-song排除、隱藏／到期拒絕由已回滾的SQL交易測試驗證。
- Next清空題目、失敗重試保留原選擇、換帳號清私人資料、guest返回原入口由runtime tests驗證；未使用正式會員留下測試票。
- 中英日韓320px兩路由console error檢查為空；開發工具N徽章和Chrome翻譯擴充浮鈕不屬於產品，正式截圖另在發布證據記錄。
- 全景中的標題／按鈕／控制字在1440px原圖皆可辨；另以390px控制與選擇實際截圖確認觸控佈局，不需要另做有損放大crop。成對比對的控制區、reward和模式CTA亦逐項檢視。

## 後續P3

- 概念稿紙牌A/B與手写器材小標未逐像素複製；正式稿以真實匿名標籤與無識別設備plate呈現，避免烘焙功能文字。
- 盲聽第一版限現有音檔；連結作品保持一般探索／Heart資格。無可用題目、失敗與guest狀態已實作，來源概念未包含這些狀態。

## 完成檢查

- [x] 來源與同狀態實作成對比較及修正迭代
- [x] 桌機／手機與四語檢查
- [x] 真實音訊播放及評測控制
- [x] 無剩餘P0／P1／P2；P3明列
