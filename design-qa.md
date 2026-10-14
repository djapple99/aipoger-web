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

## 正式發布補驗

正式app0a36bf6／dpl_2cEZeFgVyCoywmn4ktnUz9vjZ2CS已promote。production-battle-desktop.jpg及production-listen-desktop.jpg為1440×1024；production-battle-mobile.jpg、production-listen-mobile.jpg為390×844。正式四語兩路由320×812無水平溢出、console error空。真實登入session實際A／B均播放15–45秒並停在45，後端heard兩側30秒，三選擇解鎖；保留pending，未代人選偏好，0正式票／0Credit。

## 8秒／自動接題修訂驗收

依使用者2026-10-14實測回饋，本輪以各側至少8秒、成功即自動新題、常駐「離開評測」覆蓋概念稿的Next／揭示停留。沿用同一插畫與三選擇單排，標題下和狀態區明示最低8秒；雙audio提前metadata載入、定位15秒、僅一側可播放。

隔離實際元件Chrome1440×1024：A／B尚未播放均readyState4且currentTime15；A實際播放9.231875秒、B9.201568秒，A單獨達標仍不可選，B達標三選擇解鎖，未等30秒即可送出。偏好A後同回應換至fixture-q4，上一題3點提示保留、選擇重設，沒有Next按鈕，離開一直可用。平手也實測自動接題；fixture不寫正式票／Credit。新證據blind8-local-desktop.jpg／blind8-local-mobile.jpg。

四語runtime確認7.9秒任一側不可選、8秒解鎖、30秒仍停在45；送出後不多GET，新題失敗只重讀、不重投或重領。退出停止兩側音訊且不投票。SQL交易測試對7.999／8秒界線、原子發點、無序pair及source privacy完整回滾；所有service-only權限保留。

本次新文案與離開是已確認的功能變更，沒有額外視覺P0／P1／P2。final result: passed。

正式版本621e2b3／dpl_Dpfro1VPxLnjYbta7xs3S3jRjmvE已promote：桌機雙側readyState4／time15，B播放時A維持paused，離開回Battle並卸載盲聽audio。中文說明縮短後沒有2字孤行；正式四語與390px／320px截圖另存在私人outputs。沒有代使用者選偏好或寫測試Credit。

## 8秒可拖曳與HUD修訂驗收

依2026-10-14最新授權，在同一插畫舞台內加入緊湊狀態HUD，不新增大面積空白或多一步開始／下一題按鈕。YOU READY?、聆聽、LET’S GO評選、NEXT ROUND與音訊準備皆有明確狀態；薄荷評選與暖橘聆聽、各側0–7/8s／可拖曳識別，reduced-motion停用動態。每側8秒解鎖slider及重播，三選擇仍單排。

本機實際元件A8.323911／B8.338375秒已解鎖；兩首開始前片段準備好，假跳秒／網路等待不當聆聽。手機390×844 HUD未遮play／slider／選擇，沒有水平溢出；VS已往下移，與HUD不重疊。

正式app c20f7c4／dpl_4Q9gXXNBLUZ96zWWm2oQEWHd5T8T已promote；1440×1024及390×844 screenshots為blind-hud-production-ready-desktop.jpg、blind-hud-production-vote-desktop.jpg及blind-hud-production-vote-mobile.jpg。A7.503661秒仍鎖定，B8.315950／A8.879882秒已解鎖；拉A至片段起點不取消已達標狀態，未提交正式偏好。四語320px無水平溢出、console errors空。Chrome翻譯擴充浮鈕不是產品UI。

發布SQL、RPC權限與完整回滾證據讀[本輪發布紀錄](docs/releases/2026-10-14-blind-hud-seek.md)。只有來源／冷啟動的等待依網路而異，HUD不把它算進8秒。無新增P0／P1／P2；final result: passed。

## 探索封面歌詞與點外收合修訂

2026-10-14使用者錄屏中的BATTLE RECORD入口改為歌詞，不新增卡片操作列；資訊圓形圖示替換文件圖示，分享／播放／歌名旁Heart及評論维持位置。Popup黑底暖橘邊框、獨立橘色捲軸、清楚44px關閉鍵，原入口保持在面板之外；小螢幕依viewport換上／下方定位。

實際Chrome：歌詞按鍵／點外／Esc／另一曲／X／頁面scroll和resize能收起；內部PageDown仍開啟，原作品換行可讀；純音樂缺詞只顯示compact空狀態。只有一個Popup，不沿用會多開的戰績map。Global歌詞dialog點外收起且不停止音訊，原padding／文字點擊保留。沒有改正式戰績資料或接戰同意。

正式app567ce28／dpl_7uAYD1ktw42T3SR7ESvGWby5uy3L已promote；截图lyrics-production-desktop.jpg、lyrics-production-desktop-full.jpg及lyrics-production-mobile.jpg在私人outputs/aipoger-explore-lyrics，桌機／手機无溢出。四語本機與正式站320px、中文桌機／手機檢查通過，console errors空；正式四語每次點外都收回0個popover。

無新P0／P1／P2，接受挑戰入口呈現保留roadmap待議。final result: passed。
