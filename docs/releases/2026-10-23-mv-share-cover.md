# MV分享封面與作品專屬預覽

使用者確認日期：2026-10-23（Asia/Taipei）。

## 問題與修正

使用者錄影中，複製〈還沒學會忘記〉的MV連結貼到Facebook時，預覽顯示AIPOGER品牌Logo。原因是`/mv`的metadata忽略track參數，封面固定為品牌圖，canonical及og:url也移除了作品ID，讓不同作品可能共用同一份社群快取。

- 單支公開MV分享使用原影片的YouTube封面、歌名及作者，Open Graph與Twitter一致。
- canonical、og:url及中英日韓alternates保留原track ID與語言，排除其他參數。
- 伺服器先從同一公開MV清單定位原作品，依序檢查最高解析與標準縮圖；兩者無法取得時回退至同影片的高畫質縮圖。固定YouTube來源，拒絕轉址，單次2秒逾時，不讓社群爬蟲依賴前端onError。
- 不存在、隱藏、撤下、非影片、無效或重複track參數不洩漏作品資訊。資料來源失敗仍保留可開啟的MV總覽及一般預覽。
- 分享入口與接收流程沿用原網址／作品ID，不自動播放；本輪不新增評論觸發自動發文，也未向Facebook送出貼文。
- 沒有資料庫、Auth、Storage、Credit、評分、評論或排行修改。

## 驗證

- 33項相關測試全過，涵蓋作品定位、四語metadata、唯一網址、高解析缺圖／網路失敗回退、不可公開資料及原分享接收流程。
- 完整684項：651通過、33項既有可選DB測試略過、0失敗。TypeScript與webpack正式build通過，lint0 errors／14項既有warnings。
- 本機沿用既有環境discovery不可用，實際HTTP只得到安全的總覽回退；不以本機當成正式封面驗收。
- 正式以Facebook爬蟲User-Agent逐一讀取68支MV：68／68為各自影片封面、作品歌名及完整track網址；metadata均在HTML head內，Twitter與OG圖片一致。
- 65支使用最高解析；〈V O R A C I O U S〉、〈愛肝〉、〈No Longer Alone〉的最高解析回404，正式metadata均改用同影片sddefault，圖片回200。
- 原範例〈還沒學會忘記〉：`og:image=https://i.ytimg.com/vi/NXeLr7SaePI/maxresdefault.jpg`，og:url與canonical保留`d4b2d481-d443-4e4e-8ab9-2d28f2307a41`。
- 正式窄版瀏覽器開原MV視窗，影片封面、歌名與作者、原9.5分及愛波哥公開署名評論保留；未自動播放，console errors為空，未發表測試評論或Heart。
- 四語、未指定作品、無效作品與重複參數以正式HTTP補驗；一般入口可讀。

## 正式發布

- 應用：`07918140ab19d7215bfa0be1bd9a032cab516e2c`，分支`codex/public-rule-copy`，已push。
- Vercel：`dpl_AJRsf7z6BByhZ9N9AzktWN5h44nW`，READY，aipoger.com與www均綁定同版。
- 本輪繼承`b0593ca`的MV完整清單與評分優先排序，以及既有Credit與評論定案規則。
- Facebook或其他平台已有的舊預覽快取不會因網站部署立即更新；需要平台重新抓取。此驗收證明正式站提供正確爬蟲metadata，不宣稱既有Facebook貼文的快取已清除。
- 私人驗收證據：`New project/audits/2026-10-23-mv-share-cover/`；工具log與截圖不提交至Git。
