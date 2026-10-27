# 探索音樂／傷心酒吧進頁隨機連播

2026-10-27（Asia/Taipei）使用者要求先讀最新report及MD，將探索／傷心酒吧改為進頁自動隨機播放，由聽眾自行暫停。現行產品及體驗正文已依本次指令更新。

## 實作與發布

- 應用`56825bf`（主修改`9e5c67b`，首次測驗及初始化`edc8193`）；已推送`codex/public-rule-copy`，繼承原`9c90072`的新聞、精選MV與Credit發布。
- Vercel `dpl_BbLTt1ikztkQDomXDTbndkTVb9Gw`，production／READY；先`--prod --skip-domain`驗收，再promote同一build。`aipoger.com`查回相同部署ID。
- 公開曲庫ready後建立隨機循環session，預設全部曲風；指定曲風的舊連結沿原選擇。背景首次開頁延後到可見。既有session包含已暫停歌曲保留；同次頁面暫停／關閉後，poll／語言／focus不重新起播。
- 自動start明確使用`intentional:false`，不冒充主動點播；其餘主動入口及原排行／Credit未改。原root audio與可見官方YouTube小播放器、互停、曲終接續、seek／volume、Heart／評論ID沿用。
- 首次耳朵測驗不再自行開modal，避免遮擋並暫停YouTube；原「測測你的耳朵」按鈕、視窗、測驗結果與推薦保留。YouTube未ready時不呼叫pause，導航短暫缺失video data時不拋錯或誤接曲。
- 瀏覽器不允許有聲autoplay時，停在當首並顯示手動繼續提示，不靜音假播、不重試迴圈；沒有保證所有裝置進頁都能免點出聲。

## 驗收證據

- 完整932項：893通過、39既有選用略過、0失敗。新runtime覆蓋ready前後、混合隨機佇列、legacy曲風、既有暫停session、關閉後刷新、hidden初入、阻擋恢復與被動聆聽；YouTube初始化及metadata缺失回歸通過。
- TypeScript通過，全站lint 0 errors／9既有圖片warnings，最後修改檔ESLint無錯誤／警告。本機webpack正式build使用公開placeholder設定驗編譯，缺少伺服器配置的公開資料讀取不算本機實播；最終Vercel build使用既有正式環境且READY。
- 真實Chrome允許自動出聲情境，無播放點擊直接播音檔《錯過彼此》，3.82秒／248.4秒；按暫停停在20.577秒，focus觸發刷新後仍相同。最終build同樣無點擊播放YouTube `0NlXuljHn0I`，4.7秒進度、native audio暫停、無modal；其自然結束後選中下一首。測試seed只用於瀏覽器固定YouTube驗收，產品仍使用真正shuffle。
- 候選站接到canonical `aipoger.com/api/audio-assets/...`的下一首時，出現跨origin CORS限制；沒有放寬正式CORS或改來源。正式站是相同origin，另驗實際播放。這不是宣稱候選站所有來源都可連播。
- 嚴格user-gesture-required的390px新訪客情境：native當首載入但時間0、paused、顯示瀏覽器提示；實際按播放後2.53秒、paused=false、提示清除。最終build再驗阻擋保留當首、0秒、無modal。
- 中英日韓320px，及390／768／1440px均無文件水平溢出，原主要播放／暫停控制至少44px高；不自動彈測驗。手機與桌機截圖保存在私人`audits/2026-10-27-radio-autoplay/`。
- 正式`https://aipoger.com/ai-music?lang=zh`隨機實播《愛像風暴捲起我》，2.83秒／322.56秒、paused=false、無modal、browser console error0；按暫停及focus後不重啟。發布查核deployment runtime error／fatal 0。
- 沒有DB／migration、Auth、Storage、會員／作品／評分／Credit規則更改或正式測試投稿／Heart／評論。沒有實體iOS真機或全部影音來源的全面驗證。

產品／體驗／工程、固定索引與私人協作入口同步維護；Drive沿既有固定ID原地更新，不另建主文件副本。
