# Choice 混合來源自動播放修復

使用者希望全部播放及換曲不再逐首按Play。本輪只改播放控制，沒有歌單、收藏、點數、排行或資料庫寫入。

## 根因與修復

正式歌單「萬聖節的音樂狂歡派對」含5支YouTube、4首上傳音檔、1首Suno《L.N.C｜藍幽靈》。任一Suno／Spotify會將全歌單送入混合來源dialog；其中ExternalMusicPlayer原未提供autoPlay，第一首與每次YouTube換曲都停在封面。正式站舊版已重現。

混合歌單改為整個session共用同一個YouTubeRadioPlayer，ready後loadVideoById直接播放，切曲重用iframe而不重建。非YouTube曲目時只cue且暫停，隱藏期間不播放。播放器只豁免自身dialog，其他視窗／背景頁仍暫停；曲終去重與舊來源事件防護保留。設定loop=0；正式候選仍遇到YouTube Shorts忽略參數自行循環，因此追加官方API進度保護：只有連續觀察到實際時長末端並自然跳回開頭，才去重換曲。背景／暫停／非末端倒轉不推進；不猜歌曲長度、不提早截斷。初始化失敗與瀏覽器阻擋顯示短提示，恢復播放即清除。Suno／Spotify仍用原ExternalMusicPlayer，一般作品預覽不變。

## 範圍與限制

本輪不宣稱含Suno／Spotify的整份歌單已全自動。目前仍使用官方嵌入，沒有已接上且可驗證的外部播放控制／完成回報。第三首Suno目前無同作品YouTube或上傳音檔來源；保留原作與順序，不抽音、不捏造時間或自動略過。要這一份十首全程自動，需要該首有作者提供的可連播來源，或原平台提供可用控制介面。

YouTube技術依據：https://developers.google.com/youtube/iframe_api_reference （autoplay、playVideo、onStateChange、onAutoplayBlocked）。

## 驗證與發布

最終Shorts補修12項定向通過；全套、TypeScript、lint及webpack結果於正式發布驗收後補齊。

本機實播：YouTube下一首直接開始，實際video paused=false與秒數前進；Eve的30秒Shorts自然播畢後自動接2秒合成音檔，再自動進Suno（原限制），未按Play或下一首。官方iframe維持同一個widget2。先前重建iframe與未關閉Shorts循環的候選未發布；一般preview環境缺正式設定也未promote。正式設定使用CLI --prod --skip-domain驗收後才promote。測試不寫歌單、收藏、點數。

候選165cec3在正式設定實測第一首自動到第二首，但Shorts仍循環，因此未promote，補上實際進度越過曲尾的回退處理後重新驗收。待補最終發布證據。本機fixture、短音檔、診斷log於驗收後移除。
