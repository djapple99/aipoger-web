# Choice 混合來源自動播放修復

使用者希望全部播放及換曲不再逐首按Play。本輪只改播放控制，沒有歌單、收藏、點數、排行或資料庫寫入。

## 根因與修復

正式歌單「萬聖節的音樂狂歡派對」含5支YouTube、4首上傳音檔、1首Suno《L.N.C｜藍幽靈》。任一Suno／Spotify會將全歌單送入混合來源dialog；其中ExternalMusicPlayer原未提供autoPlay，第一首與每次YouTube換曲都停在封面。正式站舊版已重現。

混合播放器現在明確要求YouTube autoplay=1及ready後playVideo，播畢接續；一般作品預覽維持需點擊開始。結束事件只有實際播放後才生效、同首只推進一次，已切換／關閉的來源不能跳曲。初始化15秒無回應／播放器失敗及瀏覽器阻擋均提供短提示。手動來源說明僅在目前為Suno／Spotify時出現。

## 範圍與限制

本輪不宣稱含Suno／Spotify的整份歌單已全自動。目前仍使用官方嵌入，沒有已接上且可驗證的外部播放控制／完成回報。第三首Suno目前無同作品YouTube或上傳音檔來源；保留原作與順序，不抽音、不捏造時間或自動略過。要這一份十首全程自動，需要該首有作者提供的可連播來源，或原平台提供可用控制介面。

YouTube技術依據：https://developers.google.com/youtube/iframe_api_reference （autoplay、playVideo、onStateChange、onAutoplayBlocked）。

## 驗證與發布

14項定向通過；全套969項968通過／1既有選用略過／0失敗，TypeScript通過，lint0 errors／9既有img warnings。後續加入初始化逾時處理，7項定向重測通過。

本機可驗證音檔自動結束切到下一支YouTube，但localhost的YouTube iframe空白，未算實播成功；正式舊版相同影片可載入並確實停在手動Play。待部署版本以實際影片進度及自動換曲驗收，再補發布證據。本機測試頁與合成短音檔已移除，不提交。
