# AIPOGER Product Rules

文件整理：2026-10-15 Asia/Taipei；產品實作基準：2026-10-15。主文件 2／6。創作者私人作品表現已正式發布；文件整理與功能發布分別查核。

## 修改依據與確認日期

2026-10-15（Asia/Taipei）使用者確認並授權完成本輪修復。本文件為現行基準；驗收範圍、發布版本及限制見[YouTube電台／投稿report](releases/2026-10-15-radio-link-submission.md)及[參與流程report](releases/2026-10-15-participation-flow-fixes.md)。未有使用者新的明確指令，不得擅自改動點數數值、追回／恢復、投稿額度、排行公式、Owner權限、舊歌排除名單或公開文案邊界。修訂須記錄確認日期、具體差異與驗證證據，先更新對應現行正文，再同步索引與既有Drive檔案。舊技能摘要、歷史發布紀錄、GitHub main或另一代理的提案不能覆蓋現行規則；使用者後續明確指令仍優先。report提供證據，不另建立第二套產品規則。

Showtime 認證已退役；2026-10-14前台改為Choice選曲與社群人物Top5，移除頁面歌曲月榜；月榜原資料與Owner管理仍保留。Choice與人物排行是不同訊號，不更改探索人氣、正式Battle或Credit。

This document is the product-rule source of truth for AIPOGER. Use it before changing Battle, Bar Heartbreak, AIPOGER Showtime, auth, upload, or deployment behavior.

## 現行狀態邊界

- 新版創作者中心與三種來源連結投稿已發布，2026-10-15起預覽／試播選用；本次Credit發布包含台灣每日回訪15、有效評分評論10、歌曲／MV送愛心者3、盲聽每題3及額外成功投稿60；聖經扣點與APC仍未啟用。

- APC 尚未啟用為產品點數經濟，不宣稱儲值、下注、獎勵或廣告換點已上線；歷史常數、欄位和字串不構成產品能力。
- Profile 投稿不自動轉為 Battle；Explore 接戰依創作者明確選擇與準備好的 Drop。Drop／Q Crash 自願對戰保留。
- 酒吧生存淘汰、Showtime 認證與 Daily Spotlight 已退役；以下提到的历史資料保存是資料完整性要求，不是要恢復那些玩法。
- 自動音訊曲風建議 worker 尚待啟用；手動投稿與已發布分類選單可用。
- 創作者私人作品表現第一版已於 2026-09-27 上線，定義見下節。既有 owner analytics 與 Earworm 反應選項是不同資料來源，不可把重播意願當成實際重播。

## 探索曲庫、電台與人氣榜

2026-10-13 傷心酒吧已整合到 `/ai-music` 上方的小播放器；舊酒吧聊天、故事留言、歌詞牆及大型舞台撤下。投稿移至頭像的 `/profile` 自己作品區，不另建作品資料庫。

- 單曲的公開推廣期是 `created_at` 起三個日曆月，以 Asia/Taipei 同一時刻計算，月底不足日數取月底；不是固定 90 天。到期即退出 Explore、電台、人氣榜及首頁單曲候選；讀取 API 與前端每分鐘／返回可見時核對，隱藏、撤下、moderation-held、無效曲風及不可播放等原資格仍適用。修改資料不重設期限。
- 到期只改展示資格，不刪資料列、音檔、封面、評論、Heart、收藏或 Battle 歷史，也不退上傳額度、不重啟生存淘汰。Profile 保留原作品及預覽／管理，標記公開推廣期已結束；Showtime 歷史月榜／Choice 与 MV 既有外部連結依各自規則保存。容量回收尚未實作。
- 2026-10-14一次舊歌回歸例外：Explore／其電台與Top50使用固定205件名單，來源為10月1日前投稿且本次查核仍公開、審核通過、未刪除／隱藏／撤下的社群作品；這是依現存資料核對的名單，不宣稱為10月1日歷史快照。小柒14首、風土策展人55首共69件明確排除；不影響同作者日後正常新投稿資格。名單只放寬年齡期限，後續刪除、審核、隱藏、撤下與原Explore生命週期限制仍立即適用，不改DB狀態或原投稿日期。例外於台灣時間2026-11-01 00:00自動結束，恢復正常三個日曆月展示；沒有刪檔排程。首頁單曲、盲聽題目與Showtime保持原資格。本次查核102首已期滿作品恢復探索；名單內原仍在期限的作品若於10月底前期滿，同樣暫留至截止。Profile公開狀態／導向配合Explore，不加回歸標籤，不將舊歌重新標NEW。
- 回歸作品只有在原三個月期限已滿且例外有效時，其Top50綜合分加5點；累積總分基礎公式見下條；沒有有效Heart、正盲聽偏好或有效填寫評分的作品仍不入榜。前台不另顯示加分活動標籤，實際愛心／支持者、盲聽人數／偏好、MV評分及會員Credit完全不灌票；API及前台排序各由同一公式計算，不將API結果再加第二次。截止後加分失效，不修改歷史票或戰績。
- 人氣 Top50共用目前三個日曆月曲庫（含上條回歸例外）及累積人氣總分：`3×不同Heart支持者H＋有效填寫分數總和R＋3×盲聽偏好點P＋適用的排行加成`。Heart按上架後現存有效不同非作者登入會員去重，跨天算一人，每名支持者3分。歌曲／MV共用每會員每作品的一筆最新1–10分（最多一位小數）；9分即貢獻9分，修改替換原分，不增加人數、不重複累加。只留言／回覆的文字與則數不加歌曲分數。盲聽勝1／敗0／平手0.5，同一聽眾對同曲不同配對先平均再彙整P，乘3後勝選對應3分、平手1.5分、未被選0分；同會員多遇到同曲不因配對數灌分。已累積的各項總分不再乘人數；評分平均只是`R÷不同有效評分者人數`，在歌曲／MV評價區另顯示。撤下原50／50比例、曲庫最大愛心歸一化與無樣本中性先驗；零樣本貢獻0，沒有假評分。只有連結的作品仍可用Heart與填寫評分參與。至少有有效Heart、正盲聽偏好或有效填寫評分才入榜；以最終總分由高至低，同分直接按原上架時刻新歌優先，再以作品ID穩定排序。名次依序1至50，不足則显示實際數量；總分保留六位小數供比較，顯示一位小數。不按月份重設，不改七日升溫、首頁MV本週支持或Showtime／正式Battle成績。會員Credit另計，不能以餘額或發點提高票權。
- 新歌從原created_at起7×24小時內，人氣Top50綜合分加3點，剛上架起算、第七天截止時刻即失效；不因編輯或刷新重設。這是使用者於2026-10-14確認的排行加成，不是會員Credit或虛構評分。累積人氣基礎分與期滿回歸5點仍保留，兩者按原投稿年齡不會重疊；API和前台從原資料各計算一次，且仍須有效Heart、正盲聽偏好或有效填寫評分才入榜。
- 每日 Heart／收藏仍沿用原路徑：今日取消只刪今日紀錄，過去日期仍有 Heart 的會員仍算一名支持者。收藏移除不等於取消歷史支持。公開 API僅輸出支持／盲聽／評分彙總人數、評分平均／總和及排行總分，不公布支持帳號或個人評分；人氣榜不給 owner 額外票權。
- 桌機左側排行約占原六欄中的兩欄，直接顯示人氣Top50，右側四首一列；不再另開排行榜視窗。手機先預覽3首、平板4首，按「展開Top50」在原頁展開，亦可收起。榜單不放評論圖示：封面播放、Heart支持，歌名定位原歌曲卡，清除不相符的搜尋／曲風並展開原分類。電台、歌曲卡與共用底部播放器提供原作品評論視窗，不另建立歌曲頁或重複評論資料。
- 2026-10-14探索歌曲封面原「戰績資訊」改為「顯示歌詞」，旁邊保留分享。閱讀同一公開原作品的既有歌詞，不另啟播放器、不要求登入；缺詞或純音樂显示「歌詞未提供」，不自行生成。小面板保留換行、獨立捲動和關閉，點面板外／再按同鍵／Esc收起；開別首只保留一個，頁面捲動／resize也收起，面板內捲動和選字不收起。底部播放器原歌詞視窗同樣可點外關閉。正式戰績資料、排名與原接戰同意規則沿用；接受挑戰的呈現方式另列待議。
- Radio 以目前曲庫建立曲風隨機循環的 session snapshot；進頁不自動播放，使用者選曲風／播放才啟動。2026-10-15確認納入只有YouTube連結的作品：同一佇列可接音檔與YouTube，播完自動下一首，仍以原作品ID處理Heart／評論。音檔使用唯一root audio；YouTube使用可見的官方小播放器，切換時暫停另一音源，不抽取／下載音訊。YouTube在頁面隱藏或開啟modal時暫停，不自動背景接播；來源無法播放／瀏覽器阻擋自動接播時提供明確提示與手動播放／下一首。新投稿不插入既有佇列，失去公開資格或到期才從原電台佇列剔除。
- 投稿入口統一 `/profile?submit=1&lang=...#submit-work`，登入後直接開原上传表。一般會員個人168小時前三首免費、之後每首成功投稿60 Credit且需明確確認，Owner 投稿不限數量，取消每作者每曲風五首 active 上限；手選曲風、音檔格式／30MB、權利告知、雜湊、審核與失敗清理均保留；展示到期不退還已使用的每期投稿額度。帳號改變／私人曲庫讀取失敗／重複提交不得誤寫作品。
- `/listen-bar` 舊一般入口與 `/l/...` 曲風短鏈導向 Explore 電台，保留語言／曲風；原 `#play-request` 投稿深連結導 Profile。舊聊天室24小時 API與清理僅供歷史相容，沒有公開聊天介面。每曲評論仍持久保存並可交流；APC仍未啟用；會員Credit收支見下節。

## 30秒盲聽評測與Credit

2026-10-14新增`/battle/listen`，入口位於Battle最上方；Q Crash與Drop Battle保留原模式與正式結果。盲聽票獨立儲存，不寫正式Battle票、勝負／守擂、Honor Board、Showtime或MV十分制。

- 登入且非匿名會員比較同曲風兩首不同公開作品；排除本人作品、官方曲、隱藏／撤下／審核未公開／三個月到期或無效曲風作品。首版只用現有站內音檔、原歌至少45秒，兩首各取第15–45秒，前台每段30秒；不下載外站影音或另存剪輯檔。Suno／YouTube／Spotify連結投稿仍可正常探索及Heart支持，暫不加入盲聽。
- 選擇前只顯示A/B與匿名音訊ticket，隱藏曲名、作者、封面、人氣。A、B各實際聽至少8秒才可選偏好或平手；每段仍最多30秒且可重播。標題下及選擇區明示8秒門檻，兩側未達門檻時選擇停用。送出成功自動接下一題並顯示上一題獎勵；「離開評測」隨時可回Battle，不要求先投票、不發點。每側實際聽滿8秒後，該側進度條及重播解鎖，可在15–45秒片段內自行定位；未滿8秒不可拖曳，拖曳不增加聆聽秒數。HUD明示準備／聆聽／可評選／下一回合，A/B各有獨立秒數提示。A/B音訊提前自動緩衝並定位15秒，只允許一側播放，開始時關閉共用播放器。
- 每完成有效題目送出一次選擇，A、B與平手一律3 Credit；沒有標準答案、不看是否與多數相同、不要求20字評論。不同題目無每日獎勵上限；同會員對同一無序歌曲配對只有一次投票／收入，交換A/B、重送或重播不重複發點。離開／播放失敗／任一側未滿8秒不發點。有效題目用完顯示空狀態。
- 配對優先較少不同評測者的歌曲，同曲風內隨機打散及隨機A/B位置，保留原作品ID。每會員僅一個有效pending題，2小時到期；失去公開資格的作品不得新發點。正式會員身分由伺服器驗證，不信任客戶端user ID或Owner宣稱。
- 前台依實際音訊進度與經過時間顯示8秒解鎖，不等待較慢的heartbeat回覆；播放前先確認伺服器計時起點，載入等待不計聆聽。伺服器按單一活動聲道及實際經過時間限制累積聆聽，各側至少8秒、沒有低於8秒的容差；seek另外驗證該側8秒、只重設位置不加秒數，不能干擾另一側活動聲道；前台片段最多30秒。此機制限制快速偽造／重送，不宣稱能證明人的注意力。Credit與選擇原子儲存，重試讀原結果；成功回應併入新題目，不再由前端另外按Next或GET。聆聽期間可先做下一題的私有唯讀準備，不建立題目或發點，且不回傳曲目身分；真正完成作答後才重新核對資格、發點及建立下一題。餘額刷新與新題發放並行，餘額讀取逾時只標待刷新，不撤銷收入或阻止接題。新題讀取失敗仍保留成功收入，只重試載入，不重送偏好或重領點。移除原曲後已賺Credit保留，不繼承舊APC餘額。
- 公開人氣只輸出綜合分與不同聽眾彙總，不公開評測者身分；私人題目與Credit只能透過驗證後server API讀寫。Owner同樣不能自評／重複投票。

## MV分享與評論可捲動提示

- MV卡片歌名最多兩行，點歌名開原MV／評論視窗閱讀完整標題，不自動播放或跑馬燈；精選、作品卡及觀看視窗提供分享按鍵，沿用原資訊列，不新增操作排。分享連結為`/mv?lang=...&track=原作品ID`，手機支援系統分享時使用原生選單，其他環境複製作品名稱／作者與站內連結；取消分享不假稱成功，複製失敗提供手動連結。
- 分享接收者直接開原作品的MV／評論視窗，仍須按播放才啟動YouTube。全量公開MV可定位，包括不在前12張或精選中的作品；已隱藏或不可公開MV不洩漏作品資料，只提示目前不可觀看。
- MV評論視窗使用橘色捲軸；評論區尚在畫面下方時，右下角顯示「往下看評論」按鍵，捲至評論區後收起。捲动／播放不送出評論或Heart，也不改動留言草稿。尊重減少動畫設定。
- 分享不增加Heart、排行榜分數或點數；本次點數方案為每日回訪15、至少20字有效評分評論10、他人歌曲／MV送愛心3與額外成功投稿60；分享不發點。

## 首頁 MV 社群曝光

2026-10-13 首頁第一階段，限定展示推薦，不產生正式 Battle 戰果或 Showtime 月榜名次。頁面、支援計數與評論共用既有作品 ID。

- 候選來源：現有 community 投稿，需啟用、公開審核狀態、可播音訊或已驗證可播放的外站來源單曲、現行曲風，且未隱藏、撤下或退出 Explore；排除官方示意曲。MV 需有效 YouTube 影片連結，來源以既有投稿資料為準，不開放新的任意連結投稿資格。
- 首頁「本週支持」以台灣時間週一 00:00 至下週一 00:00 的現存 Heart 紀錄計算；同一非作者會員對同一作品整週最多一份支持，跨天或跨頁重按不重複加人。作者自按、訪客、外站 YouTube 愛心、過往永久總數與其他 reaction 不列入。
- 讀取全部分頁後比較候選 MV 支持人數，最高且大於零者為本週社群精選；同票全部提供切換，預設按上架時間顯示，不使用 owner 人工裁定替代社群支持。這是當週持續更新的曝光狀態，不是已結算週榜。是否加入最低樣本門檻、固定結算、連續入選限制與異常票審查，另列 roadmap。
- Heart 寫入仍沿用既有每日切換與收藏連動。取消今日 Heart 只移除今日紀錄；若本週其他日期仍保有 Heart，該會員仍計一份支持。首頁不宣稱能一鍵取消整週歷史紀錄，也不改 Showtime 月榜原有取消及計分語意。
- 全部 MV 本週支持為零時，選最新公開 MV 並標新作放映；沒有 MV 時呈現投稿／探索入口。資料讀取失敗顯示錯誤，不填假票數；支持者身分不透過公開首頁 API 回傳。
- 首頁探索單曲先套用三個月曲庫資格；MV 頁「更多 MV」保留歷史外部連結。兩處均按作品 ID 排除上方全部精選，再依原排序補位；同票精選也全部排除。首頁最多三首不同作品，候選不足時少顯示，不重複填滿。完整作品資料、評論與支持仍保留。
- 評論提供交流與推薦理由，不將留言／回覆次數換算支持票。主視覺只引用可公開展示的非作者留言，沒有留言就展示作品介紹；首頁評論視窗沿用現行 280 字留言 API。MV 專頁共用此曝光與評論機制，提供與歌曲共用的1–10小數整體評價，符合探索資格的作品計入人氣總分；不提供三項分項模型、流量獎勵或首頁購買曝光；符合會員Credit条件的站內評分評論／Heart按下方Credit規則計算。
- 嵌入 YouTube 僅在使用者按下觀看後載入，不下載或重新託管影片；本階段保留現有音訊投稿方式，不啟用三個月自動刪除，也不刪歷史作品、評論、支持或戰績。

## MV 作品放映室

2026-10-13 `/mv` 已發布；首頁 MV 導覽直接進入專頁。音樂與 MV 沿用同一作品，不另建投稿／評論／Heart 紀錄。

- 全量讀取既有 community 投稿，再按首頁相同公開條件與 Explore 生命週期過濾；包含歷史投稿及保留的 Showtime 作品連結，不限定最近三個月。未公開、停用、隱藏、撤下或不合公開播放條件的作品不重新上架。
- 有效 YouTube 影片列入 MV 清單；縮網址、watch、shorts、embed、live、music.youtube.com 轉為影片 ID 及官方 watch URL。頻道網址另列「創作者提供的頻道」，不偽裝成可嵌入影片。不猜測作者頻道或以影片去重合併不同作品；同作品 ID 只有原紀錄。
- 支援作品／創作者搜尋、實際曲風篩選、最新投稿及本週支持排序。初始展示 12 件、逐次追加 12 件，搜尋和篩選涵蓋全部已讀取候選，不只當前顯示卡片。資料錯誤提供重試，沒有結果提供重設。
- 下方卡片及件數排除上方全部精選作品，切換排序／篩選或載入更多不重複展示。搜尋只符合上方精選時，提示已在上方展示並提供跳轉，選中對應精選作品；不誤報作品不存在。
- 主視覺與首頁使用相同台北週界、不同非作者支持者數、同票共享及零支持新作規則。留言只提供交流，不增加支持票權。卡片與主視覺的評論／Heart 都接原作品 API；訪客登入後返回 `/mv`。
- MV 卡片愛心直接切換原作品當日 Heart，沿用既有收藏連動；顯示的票數仍是本週不同非作者支持者數，不以當日狀態或 API 累計數冒充週票。評論圖示開啟同一作品的 MV／留言視窗，公開評論可讀，登入後才送出留言或 Heart；關閉返回原卡片。
- 使用者點擊才載入 YouTube 官方播放器；可關閉並在原平台開啟。不下載或另存影片，不以影片觀看發放點數；站內有效評分評論／Heart另按Credit規則計算，連結投稿由創作者中心自動解析來源、確認權利後明確送出，預覽選用。
- 封面與觀看按鍵直接進同一MV觀看／評價視窗並播放；歌名／評論／分享接收連結開相同視窗但不自動播放。評分與留言不另開播放器或重播；自己的評價輸入放在公開留言清單之前。
- 登入非作者會員可手填1–10分、最多一位小數（例如4.8／6.8），顯示輸入欄位／10，撤下一排十個數字按鍵；音樂與MV共用此評價及原作品ID。每人每作品一筆最新分數，可修改，修改不增加評分人數。作者（含Owner）可留言自己的作品但不能自評；Owner投稿扣點豁免不增加評分權。一般評價表單要求填分數，搭配選填的280字留言一起原子儲存；作者仍可只留言，既有留言API與舊客戶端的只留言討論保持相容。20字是有效評論得點條件，不是禁止短留言的門檻。
- 評論修改／撤回成功後立即重讀該作品公開留言，封面平均分及評分人數同步刷新，不需關閉重開；不把修改當作新評論或重新領點。
- 封面右上顯示平均分（四捨五入至一位小數）｜不同評分會員人數，不是分數總和或留言則數。無分數顯示「尚未評分」，不填假0分；有關聯留言被隱藏的分數不計入公開平均。原留言及管理／通知沿用同作品ID。
- 「連播 MV」按當前搜尋、曲風與排序建立完整公開清單（含精選，不限首12張）；以原作品ID去重，保留不同作品合法使用同影片的情況。明確啟動才播放，一個YouTube播放器接播，提供上一支／下一支／暫停及停止連播。播完清單即停止；私密、不存在或禁止嵌入影片跳至下一支，手機阻擋自動播放時顯示點擊繼續。來源讀取失敗可重試，不將載入失敗假稱完播。
- 連播切換同步原作品、評分與留言，分數／未送出文字草稿按作品保留於本次視窗。送出評價時暫停切換，結束事件延後到提交完成；發送中的請求仍綁原作品，重送相同receipt不重複儲存留言。刷新公開清單會剔除不可公開作品，正在觀看作品失去資格會關閉視窗。
- MV與歌曲的同作品有效填寫分數共同計入Explore人氣總分；MV本週Heart、首頁精選及Showtime／正式Battle仍沿各自規則，不把人氣總分寫成正式戰績。會員Credit另計，也不以觀看秒數／完播／外站互動換點。
- Battle 的勝出發布 URL 保持原有正式結果、作者權限及上傳時完整歌曲公開同意條件，仍顯示於原 Battle Record／授權封存作品，不混入 community 歌曲 ID 或繞過公開資格。此階段沒有新增 Battle 連結展示規則。

## 創作者私人作品表現

2026-09-27 正式發布；[發布驗證](releases/2026-09-27-creator-insights.md)。數據只提供創作者本人，公開歌曲卡片與月榜計分保持原規則。

- 入口：個人頁「作品表現」，路徑 `/profile/insights`；伺服器依驗證後的登入身分取得自有作品，不能以網址指定別人。回傳彙總，不回傳聽眾身分；登出或換帳號清空私人資料。
- 第一版顯示最近 28 天有效登入聽眾、完聽率、主動重播率、聽後 Heart／收藏轉換率；另列目前不同非作者支持者／收藏者及本人的正式已結算對戰得票率。數據缺失顯示累積中，讀取失敗顯示錯誤，不補假零。
- 新聆聽紀錄：一次播放滿 30 秒算有效；暫停／恢復保持同一次。完聽是實際覆蓋至少 85% 不重複音訊區間；拖曳不算已聽。重播須另一個主動開始且滿 30 秒的播放，自動接播／酒吧循環不算。
- 聽後轉換以有效登入聽眾為分母，計其有效聆聽之後記錄且目前仍保留的支持／收藏；舊收藏無個人保存時間不能假設為新轉換。Heart 連動收藏，兩項不可相加。這是觀察到的現存轉換，不是歷史所有按下次數或因果歸因。
- 新版比例只用新版紀錄與登入非作者聽眾；舊事件與訪客不混入，不能宣稱上線前已有完整歷史。Earworm 的 replay 意願選項仍不等於實際重播。
- 只列目前啟用且屬於本人的公播曲庫作品；正式對戰另列已結算且符合正式觀眾門檻的 Drop Battle／Q Crash，不揭露進行中的密封票。
- 無效或未登入請求被拒絕，私人回應禁止快取。分母為零顯示資料累積中；少於 20 位有效聽眾提醒樣本較少。

## Product Principle

AIPOGER is a music discovery and review community that recommends creators through listening, meaningful feedback, community support and optional Battle participation.

The product should favor:

- Real creator activity over mock/demo content.
- Relative fairness over impossible absolute fairness.
- Clear public rules over hidden platform behavior.
- Early-stage limits that keep the room lively and manageable.
- Music-first language, not generic SaaS language.

## Social Publishing

Current behavior target:

- `/admin/social` is a semi-automated social publishing console, not a fully autonomous posting bot.
- Every generated post must remain a draft or review item until an admin explicitly approves it.
- Supported first-version sources are Battle result/report drafts and manually created scheduled drafts.
- Social post states should include `draft`, `needs_review`, `scheduled`, `published`, and `failed`.
- Use `60s Drop Battle`, `30-60 秒抓波`, and `drop / 抓波` in social copy. Do not return to `45 秒` as the current public spec.
- Battle report copy should use winner, vote count, genre, battle/result link, and clear CTA.
- A 0:0 no contest must not generate a Winner Circle post.
- Winner posts that become image/video/Reels content should use the winning creator's music as the background track when rights and platform workflow allow it.
- Instagram image and video posting must preserve the original crop/aspect setting whenever the platform UI offers it.
- The Social Desk connection indicator means only that the required runtime configuration exists. It must not claim delivery has been verified, and it must never send a test message automatically.
- Discord may publish directly through its official webhook only after a draft is approved and an admin explicitly presses that platform's send control.
- X may publish text/link posts only with a user-context access token carrying `tweet.write` (`X_USER_ACCESS_TOKEN` or `SOCIAL_X_USER_ACCESS_TOKEN`); an app-only bearer token is not a publishing credential.
- Instagram and YouTube remain draft/script/caption generators until their media and API workflows are fully verified. Facebook Groups remain manual. TikTok is excluded from the active Social Desk and new draft generation; historical targets and records remain intact.
- Facebook Groups must not be auto-posted through unstable browser automation or password-based login. For the AIPOGER group, provide copy, assets, and the group link for manual posting: `https://www.facebook.com/groups/aipoger`.
- Do not store social platform passwords. Tokens, webhooks, and API keys belong in environment variables or encrypted storage, never in repo, docs, or logs.
- If a platform token/webhook is not configured, show a disconnected/pending state and do not attempt publishing.

Public social entry:

- The public social icon cluster includes the AIPOGER LINE community invite alongside Discord, Instagram, and the Facebook group.
- LINE is the direct mobile action; a separate QR control opens a compact modal for desktop visitors, with the same canonical invite URL and a copy action.
- Keep the QR code out of the permanent homepage layout so it does not add clutter or create a useless mobile scan step.

## 創作者中心與連結投稿

- `/profile` 為個人創作者中心：音樂投稿總數、目前推廣／期滿／下架狀態、私人收藏歌曲與 Choice 總數、其他會員的可見評論人數及則數集中呈現。總覽作品每頁 4 件；完整原作品管理仍每頁 10 件。私人歷史不因三個月公開推廣期結束而抹除，不補過往最高排名。
- 所有投稿入口進個人的投稿區。接受上傳音檔及 YouTube 影片、Suno 單曲、Spotify 單曲連結；不接受此入口的專輯、歌單或任意網站。連結只保留來源與 metadata，以原平台可見播放器播放，不下載或另存外站影音。來源讀取失敗不自動發布，保留來源輸入供重試；試播不是投稿門檻。
- 2026-10-15使用者確認：連結與音檔均不強制開預覽或試播。貼連結後自動讀取來源資料，必填資料完整、勾選作品權利聲明及適用的扣點確認後，按「確認投稿」才發布。預覽／試播是選用功能，不消耗投稿額度、不產生公開作品；換來源重置權利確認，不沿用舊來源資料。來源解析與來源綁定仍必須成功，不能把播放器載入或未試播視為版權／完整播放保證。Spotify播放長度由來源決定。
- 音檔與連結共用個人首件成功起算168小時的前三件免費額度，額外成功作品每件60 Credit；取消每作者每曲風5件active庫存上限，唯一Owner不限投稿數量。刪除不退個人期間額度。保留原 ownership、moderation、正式投票與接戰規則；連結投稿預設僅展示，不自動加入 Battle。
- YouTube 作品由投稿者勾選是否包含 MV；勾選後在音樂與 MV 面共用同一原作品 ID、愛心和評論，不另填第二筆。重複同作者同來源單曲不新增；既有音檔作品已附相同 YouTube 影片時，從原作品編輯。
- 連結作品可進探索與同一三個月人氣榜，使用可見外站播放器。傷心酒吧已接受YouTube連結與音檔混合曲風連播；Suno／Spotify仍使用個別可見播放器，現有Choice選曲及盲聽仍要求實際音檔。不能將外站URL填成音檔或藏起YouTube播放。音檔投稿的選用預覽使用一次性的本機音訊控制。
- 私人統計只查經伺服器驗證的本人資料；支持人数按不同會員去重且排除作者，評論只計其他會員在現行 DB 的可見評論。資料讀取失敗顯示未知與重試，不偽造零分／餘額。舊 Storage-only 留言沒有可驗證的會員 ID，未補成完整歷史評論人數。
- 唯一 owner 保留既有受驗證的本人身分，平台後台只向 owner 顯示並沿用伺服器授權。不能用顯示名稱或可自行修改的 user metadata email 授權。其他會員只管理自己的資料。
- 本次Credit發布：伺服器以Asia/Taipei日期認定每日首次有效會員回訪15點；他人歌曲／MV原作品送愛心3點；評分搭配至少20個文字／數字、通過基本反灌水及正規化複製檢查的評論10點。短留言照常可送出，基本檢查不保證語意品質。每人同作品的愛心／評論淨獎勵最多3／10點；取消愛心、修改成不合格或撤回獲獎評論會追回，恢復有效互動恢復同份獎勵。新增短討論不撤回另一則仍有效的獲獎評論。已花掉的部分記待追回欠額，後續收入先補欠額，補足前不能花點。整首歌下架不自動追回歷史獎勵。
- 保留原盲聽每題3點、所有既有盲聽收支與168小時免費投稿窗口，不承接APC，不追溯批量發點。每個窗口前三件免費，之後每件成功投稿60點；投稿前需明確確認扣點，作品與扣點同成同敗，失敗、預覽及重試同一件不多扣。Owner依既有已確認Auth主信箱免投稿數量／扣點，不偽造無限餘額、不增加投票／評分權。
- 一般會員看真實可用餘額、待追回欠額及最近50筆本人收支。新增流水與舊盲聽歷史合併讀取；餘額、發點、追回與編輯RPC的會員身分只由驗證後伺服器取得。APC、付款、作者收到愛心獎勵及聖經扣點均未啟用。

### Credit 正式數值與對外文案邊界

2026-10-15核對：每日回訪15、有效評分評論10、他人作品Heart3、盲聽每题3与額外成功投稿60已正式啟用；原盲聽流水保留，無歷史補發。取消／撤回追回、恢復同份獎勵、欠額先補足及基本反灌水後發點，是使用者在「檢視 Aipoger 最新改版進度」中的明确選擇，不能當成未授權提案撤回。正式遷移為`20261014164151_credit_participation`。

- 每日回訪依台灣日期一天一次；評測不同作品不限每日次數。同會員同作品Heart／評論淨獎勵各最多3／10；短留言仍可討論，只有有效分數＋至少20文字／數字並通過基本反灌水的評論符合10點条件。基本規則不保證語意品質。
- 只有使用者本人沿既有Owner身份免投稿數量／扣點；不提高投票權或排行權重。豁免屬內部權限，公開四頁指南與公開點數規則不顯示Owner免扣說明。本人私人中心與後台仍按既有權限可用。
- 舊歌回歸+5是內部排行計算，公開指南不顯示數值或加分標示；正常三個月推廣及11月1日回歸結束資訊可保留。
- 投稿送10、Choice／聖經貢獻20、創作者收到Heart獎勵、聖經2點解鎖與APC／現金收款均未啟用；不得從過時草案推定已可領點或扣點。

## AIPOGER Choice 與社群發布

Daily Spotlight 已退役：它不再是傷心酒吧、Explore、`/admin/listen-bar` 或社群發布的工作流，也不建立新的單曲 Spotlight 替代品。

- 傷心酒吧在 Explore 上方負責公播，Profile 自己作品區負責投稿；Explore 負責找歌、收藏、分享、人氣榜、明確自願的攻擂與正在升溫；Showtime 保留品牌，`/rank` 同頁呈現 Choice 與社群人物Top5，不分頁籤；歌曲月榜退出前台，歷史資料及Owner管理保留，不再是認證作品庫。
- `AIPOGER Choice` 是唯一人為策展訊號：每個台灣週一週期一份、發布 5-10 首、不排名、可跨類型。任何登入帳號都可從 `/rank?lang=zh#choice-weekly` 的「製作我的 Choice」進入 `/profile/choice` 私人收藏選曲；來源涵蓋所有公開且可播放的收藏歌曲，不限認證、上架 30 天或受邀資格。owner 也使用同一個人製作入口；`/admin/choice` 只管理已發布歌單，`/admin/showtime` 導向作品管理，不再提供人工認證。完整選曲與週次規則見下方 Choice 章節。
- Choice 使用歌單既有封面（未設定時回退策展者個人資料封面），固定顯示日期、當期自訂標題、歌單 Heart、分享、評論與歌單圖示；策展者名稱與標題分開呈現，不得重複拼接。首張顯示文章摘要，完整推薦保留於歌單 HUD 與公開頁，不另做文章 HUD。
- 歌單維持單一圖示：桌機 hover / focus 可快速看排序，點擊後開互動 HUD；手機點擊直接開 HUD。HUD 上方並排顯示當期標題／日期與推薦簡介，每首歌提供既有歌曲收藏愛心及播放，底部提供「全部播放」與完整分享頁入口；所有播放共用底部播放器。
- Choice 評論是歌單層級內容：完整 Choice 頁的歌單下方直接顯示，公開可讀，任何登入帳號都可留言，作者可刪除自己的留言，其他留言可檢舉。回覆會在輸入框帶入對方名稱，明確按送出才提交；歌曲本身的評論保持獨立。發布／撤回同一請求必須保存當下週次、標題、推薦文章與 owner 策展身分。
- 公開 Choice 分享頁必須在伺服器輸出專屬 Open Graph / Twitter metadata。2026-09-21 確認：分享縮圖與頁面使用同一張 Choice 封面，不另做分享海報；封面優先，未設定時才回退個人頭像或官方品牌 Logo，回退也必須與頁面一致。分享連結指向個別 Choice，標題與描述使用當期自訂標題與推薦文章，不得從標題猜測策展身分。
- `/today` 只作舊外部連結相容入口，固定以 307 導向 Choice；`/listen-bar?spotlight=...` 必須退化為正常傷心酒吧，不指定歌曲也不改變輪播。
- `listen_bar_daily_spotlights`、歷史素材與舊社群草稿只保留歷史資料，不再由 app 日常流程讀寫；本階段不刪資料、不跑 destructive SQL。
- `/admin/showtime` 不再是認證目錄，也不提供 30 天候選審閱、人工授證或每週授證額度。owner 仍可依既有權限編輯社群作品封面與顯示資料（歌名、創作者、AI 工具、類型、製作資訊、作品介紹、歌詞、YouTube、外部支持連結），或撤下公開展示；不得改寫音檔、歷史認證資料、Battle 戰績、票數、Heart 或代替創作者開啟接戰。`/admin/social` 是唯一社群草稿、批准與手動發布中控台。Choice 選曲不會建立社群草稿或自動外部發布；草稿需先批准，Discord 仍需明確按平台發布才送 webhook；Facebook 社團維持手動發布，Instagram 與 YouTube 維持草稿。TikTok 不在目前工作台或新增草稿流程，歷史資料保留。
- Discord 是社群擴散管道，不是產品規則來源。所有對外 CTA 應把聽歌、投票、按心、留言與投稿導回 AIPOGER 網站與 Choice。

## Auth Rules

- Anyone can listen to public music surfaces.
- Sign-in is required for uploading, protected voting/commenting, protected analysis APIs, Battle participation, and creator-owned track deletion. The anonymous Drop arena exception is defined in the Drop Battle section; Q Crash voting still requires sign-in.
- Bar Heartbreak voting and track comments require sign-in.
- Bar Heartbreak listening does not require sign-in.
- Bar Heartbreak must remain publicly listenable; do not block the radio/player behind auth.
- The public music-analysis tool directory contains external links only. Existing protected analysis APIs still require sign-in; no upload or scoring is added to the directory.
- These auth rules are system behavior rules. Do not surface them as a long rule block in the product UI unless a help/legal page explicitly needs them.
- A signed-in account can keep one active Heart per Bar Heartbreak track per Asia/Taipei calendar day. The active Heart is also a saved song.
- Re-pressing an active Heart on the same track cancels that day's Heart, removes the saved song, and decrements the shared total. The listener may Heart it again afterward.
- Removing a saved favorite is also available from the user's Profile saved-song manager, even while that day's Heart remains active. Profile removal is a direct saved-song management action: it removes only the saved record and does not fabricate, add, cancel, or recount a public Heart reaction.
- Public music surfaces must show total Heart count only as the public metric. They may light the viewer's own Heart button while today's Heart is active, but must not display a public favorite state, favorite-user count, or who saved the song; personal saved-song management belongs in the user's Profile.
- Explore AI Music and Bar Heartbreak must read and update the same `listen_bar_tracks` Heart totals for the same song; Explore must not create a separate favorite or Heart counter.
- The personal Choice workbench must let signed-in curators preview eligible public, playable songs from their favorites before selecting them. Use the compact bottom audio player with play/pause, seek progress, and volume controls; unavailable audio stays visibly disabled rather than pretending to be playable. Choice selection uses its own checkbox, never the song Heart button.
- V1 allows creators to react to their own Bar Heartbreak song.

## Account Dock / 浮動帳號頭像

Owner task alerts (2026-09-18): the global avatar has a separate red task-count link for unresolved owner work. It links to `/admin#pending-tasks`; clicking the avatar itself still opens Profile. Pending work includes cross-month chart decisions, open/reviewing work or comment reports, and unpublished visible social targets. New-song promotion (manually viewed in Bar admin), all Choice drafts including retired official drafts, ordinary comments, published/completed work, retired TikTok-only targets and unenabled workflows are not owner tasks. Opening the task list does not clear the count; completing the actual work does. This is an in-site owner-only alert, not external push or email.

- Recheck visible pages every 30 seconds, on focus/visibility return and route changes. Sign-out or account switch clears private task state. Read failures retain last known positive counts and show an unavailable state in the workbench, never a false successful zero.
- Task sources are explicitly registered in `src/lib/admin-tasks.ts` and the protected summary API. Future enabled administrative workflows must register their real pending/resolved state and destination here; a new admin page alone does not automatically become a task.

- The signed-in floating account avatar is always the Profile entry for every account, including owners. A Battle or account notice must never replace the avatar link with a notice-opening button.
- The notification bell is a separate, smaller control attached to the avatar. Clicking the avatar opens `/profile?lang=<lang>`; clicking the bell opens or expands the account-notice panel.
- Dragging is an enhancement, not the primary action: pointer capture must begin only after the pointer has moved more than 8px. A normal click must reach the Profile link, and a real drag must persist the edge-relative position across release, reload, and viewport resize.
- The dock listens for Supabase auth state changes so signed-in users, owners, sign-outs, and account switches receive the correct avatar and Profile entry without relying on a full page reload. Logged-out visitors continue to see the sign-in entry on routes where the dock is shown.
- Owner administration remains available from Profile. The floating avatar itself is not an owner-only admin shortcut; only its explicitly labeled red task badge links directly to the owner workbench.

## Music Analysis / 外部分析工具入口

- `/music-analysis` 提供三個外站入口及中英日韓使用說明；不再承諾站內音訊分析、歌詞診斷、市場評分或顯示假報告。Music Bible 的「分析你的音樂」仍連至此頁。
- 三入口：Tunebat 免費 BPM／Key；Loudness Penalty 免費串流音量調整預估；Cyanite 需註冊，每月 5 首免費分析且功能有限。各卡保留官方說明連結與免費條件核對日期，配額改變時更新同一份文案。
- 使用者自行在外站選擇或上傳音檔。Tunebat、Loudness Penalty 官方表示基本分析在本機瀏覽器處理；Cyanite 將歌曲上傳其服務。Suno／YouTube 分享網址不能被承諾為可直接分析的音檔。
- 依使用者最新要求，本頁只放入口和使用方法，不嵌入外部工具、不接付費 API／MCP、不提供貼回結果表單、筆記下載、自動評分或模型報告。外站另開分頁且不附帶帳號或歌曲資料。
- 本頁為公開導覽，不需要 AIPOGER 登入；不含會員資料。Music Bible、投稿及既有受保護 API 的權限維持不變。後續若要加入站內上傳／分析需另行定義功能與權限。
- 工具讀數為參考：BPM／Key 需以聆聽校對；音量調整不是品質分數或固定母帶目標；曲風情緒標籤不等於作品好壞或商業成功。
- Music Bible 六步流程與準備發表提示同步採用外部工具按需自查；不要求三站全部通過、不提供 AIPOGER 認證，也不以分析結果作為 Showtime／Choice 的前置資格。所有入口、首頁提示、戰果分享與配對通知不得承諾未啟用的 APC 獎勵或酒吧生存玩法。


## AI Music Practice Bible / AI 音樂練功聖經

Current public entry and learning-surface rules:

- Music Bible 2.0 opens with five creative areas: Knowledge, Style DNA, Prompts, Workflows, and Solve My Problem. All existing catalog content and IDs remain searchable and copyable. Do not label member entries as new/old or expose the new lifecycle metadata statuses; do not filter out content by those statuses. Ask Music Agent and any coming-soon brief are hidden until a real feature is ready.
- Platform, model, model version, last verified date, and lifecycle status are internal metadata and owner-editor fields. Unknown values stay unknown; verification requires actual model/version/date evidence. Existing source/evidence notes remain intact.

- The homepage second lower navigation card is `AI 音樂練功聖經`, linking to `/ai-music-bible?lang=<lang>`. It replaces the old homepage-first `歌曲分析` card.
- The Bible is a member acquisition surface. Signed-out visitors see the normal Bible title and a clear value preview; do not turn the hero into a large sign-in advertisement. Open a focused system sign-in dialog only when they enter the Bible or press its practice action. The searchable Bible content is available only after sign-in, and the return path must be preserved.
- The Bible hero keeps a public, localized share action in both the signed-out value preview and the signed-in library. It shares `/ai-music-bible?lang=<lang>` through the system share sheet when available and falls back to copying the link; sharing the Bible itself does not require sign-in.
- Public listening remains the low-friction entrance: `/ai-music` and `/listen-bar` can play public music without sign-in. Hearts, saved favorites, comments, contributions, and the Bible require sign-in. On listening surfaces, request sign-in at the moment a protected action is pressed instead of placing login rules in the hero copy.
- After the member gate, the Bible includes a `LINE 實測討論區` field-room card with direct join and QR actions. It uses the same canonical LINE community URL as the public social cluster and is a handoff for sharing tests, questions, and new findings—not a replacement for the searchable Bible.
- `分析你的音樂` remains in the Bible practice map and toolbox, linking to the public external-tool directory.
- The Bible is a living, searchable practice database rather than one long static resource article. Its primary areas are prompts, lyrics, Stem separation, Drop practice, rights, AIPOGER tutorials, and external analysis tools.
- `Prompt 招式庫` and `歌詞控制` are the Bible's prompt-first practice surface. They adapt nine owner-provided Suno PDFs, DOCX files, a genre screenshot, the credited NuNaught community prompting guide, the expanded Studio Mastering prompt pack, and a modular instrument-tone pack into 163 bilingual prompt moves, 21 bilingual lyric-control moves, 93 normalized genre terms, a six-step production workflow, and the large inspiration indexes below.
- The modular `音色與混音` prompt pack adds 40 copyable directions for drums, drum machines, electric guitar and amps, piano and keys, synthesizers, bass, microphones and recording perspectives, effects, mix/master balance, acoustic guitar, strings, brass, and hand percussion. Brand and model names are only tonal references paired with audible traits; they are version-sensitive prompts, not exact hardware emulation or endorsement claims.
- The free `錄音室 Mastering` prompt category contains the original 55 genre-, culture-, or era-specific Style prompts—including five new Disco directions: 70s Classic Disco, Italo Disco, Eurodisco, Hi-NRG Disco, and Boogie / Post-Disco—plus 45 Beatport screenshot expansion prompts. The Beatport expansion covers every screenshot type except `DJ Tools / Acapellas`; `DJ Edits` remains included. These are generation directions with version-sensitive behavior, not guarantees of post-production mastering; users should export and measure the final master separately. The category keeps one main mastering filter and exposes 15 music-family filters: `Electronic`, `Hip-Hop`, `Soul & R&B`, `New Age & Ambient`, `Rock & Roll`, `Indie Dance`, `Disco & Funk`, `Jazz & Bossa`, `Pop`, `Classical & Cinematic`, `Latin & Caribbean`, `African & Amapiano`, `Asian & Middle Eastern`, `Country & Folk`, and `DJ Edit / Extended`. The family taxonomy describes musical culture and listening character; it is intentionally broader than the source screenshot's DJ-oriented genre columns.
- Studio Mastering Prompt audio examples use 15-second AIPOGER-owned MP3 clips generated from the corresponding Prompt direction. The library provides audited examples for all 100 free prompts, including the five new Disco directions. The 45 Beatport expansion clips are first-pass AIPOGER sound-direction sketches for demo listening, not formal mix/mastering references or guaranteed Suno renders. Each published clip exposes one preview action and routes playback through one fixed bottom queue player; do not autoplay or embed separate native audio controls in cards. Label every clip as a sound example whose actual Suno generations may vary.
- `Modern Taiwanese Pop` is withdrawn from the free searchable/copyable Studio Mastering library, not merely muted. Keep it out of the public catalog and audio mapping. It may return only through a separately approved paid-content product; do not expose a placeholder lock, price, checkout, or premium claim before that product exists.
- `聲音 DNA × Prompt 配方索引` is the Bible's large-reference navigator. It contains 772 searchable artist-reference entries: 771 from the supplied encyclopedia plus one explicitly labeled AIPOGER addition. It also contains 747 canonical prompt recipes from the supplied set of 750; three exact recipe duplicates are removed.
- Artist names are lookup references only. The copy action must export normalized sonic traits without the artist name and must state that direct imitation is not requested. The public UI must not reproduce the supplied encyclopedia as full pages or long prose.
- Every indexed recipe exposes Chinese labels for genre, vocal, mood, instrument, story, and texture while copying a concise English practice prompt. Search must work with Chinese and English terms.
- The large index uses two unmistakable database tabs, visible instructions, a live result count, wrapping filter targets of at least 44px, one-click copy, per-entry comments, and incremental paging. It must not render all 1,519 cards at once or hide filters behind horizontal mobile scrolling.
- Indexed material is source-derived field reference, not an official Suno guarantee. Source counts, the three removed duplicates, artist-name moderation risk, and model-version variability remain visible.
- Prompt and lyric search panels must explicitly explain that visitors can type a keyword or choose a category, show a live result count, keep inactive controls readable, and make the selected category unmistakable. Category options wrap on mobile instead of hiding behind a horizontal scrollbar.
- When `錄音室 Mastering` is selected, the Prompt panel exposes a second wrapping family filter with all 15 music families. Every Studio Mastering card shows its family badge, and changing the main Prompt category resets the family filter to `全部錄音室`.
- `愛波哥的 Suno 聖經 2026 V1` and `Suno AI God Mode Manual` substantially overlap and must be merged into one canonical set instead of published as duplicate cards. The older meta-tag sheet is folded into the same lyric-control taxonomy, and typo-heavy or over-stacked raw prompts are normalized into concise, copyable recipes.
- Every prompt and lyric move must keep a source summary and one of three confidence labels: official feature, AIPOGER field-tested, or version-sensitive. The supplied V4.5/V5 material is cross-checked against the V5.5 documentation available at the recorded historical cross-check date; bracket tags and exact slider percentages remain probabilistic test signals, never guaranteed commands.
- NuNaught's Reddit `Suno Prompting Guide` and Apache-2.0 `suno-songwriting` skill remain internal credited community sources. Their two-field routing, vocal-identity, instrument-role, section-density, fusion-builder, combined-bracket, cue-count, and singability patterns are normalized into original bilingual practice cards; the public Bible does not expose the original-source buttons or attribution labels. Community heuristics such as 4-8 enriched cues or a target prompt length remain field-tested/version-sensitive guidance rather than official Suno limits.
- The signed-in Bible retains the AIPOGER-designed `Suno Control Desk` as a tool chapter after the five creative entrypoints: a Style / Lyrics / Title quick-start route, a copyable starter template, an eight-item pre-flight checklist, and symptom-led troubleshooting. Guidance such as starting with 4-7 compatible Style cues or comparing three renders is visibly labeled as field practice, never an official Suno limit or success guarantee.
- The signed-in Bible has one high-contrast sticky chapter dock rather than another floating action button. It supports visible chapter shortcuts plus `Command/Ctrl + K` and `/` command search, keyboard result navigation, Escape dismissal, and mobile horizontal scrolling without colliding with the draggable account dock.
- Version/feature watch and rights/release checks are first-class Bible chapters. Page update date and official-doc cross-check date are shown separately; version-sensitive behavior is not blended into official product facts. Rights guidance distinguishes generation access, commercial use, and copyright protection, links to current official guidance, and is presented as a release-risk check rather than legal advice.
- A compact, localized public starter and five-question FAQ may remain indexable outside the member gate. It can explain the three Suno input roles and high-level cautions, but it must not expose the complete prompt, lyric, artist-DNA, recipe, Stem, or Taiwanese member catalogs. The route publishes localized canonical/hreflang metadata plus `TechArticle` and `FAQPage` structured data; the visible FAQ and schema must contain the same answers.
- `AI 音樂製作小指南` belongs in a separate material-to-work workflow rather than being forced into Prompt or lyric categories. Do not present fixed loudness targets, future distribution predictions, fake mastering guarantees, or software-session claims as universal facts.
- `AI 拆軌避坑指南` is the Bible's second flagship database. It adapts the owner-provided `AI Stem Separation Guide 2026` into a complete Traditional Chinese and English decision guide with 10 engine families and 7 goal-based routes.
- The Stem guide must credit the source PDF, cross-check product claims against current official documentation, date the cross-check, and clearly distinguish confirmed behavior, version-dependent model results, and undisclosed engine details.
- Product wrappers must not be presented as distinct engines when they share an underlying provider, and unconfirmed model mappings such as FL Studio = Demucs must remain labeled as speculation rather than purchase guidance.
- The Stem guide must remind creators to compare the same reference track before paying and that separation does not grant sampling, remix, or publication rights.
- `Suno 台語歌詞調音實驗室` is the first flagship database. Its initial 38 rows come from the owner-provided `Suno 台語歌歌詞調教對照表` PDF and must remain searchable, category-filterable, and one-click copyable on desktop and mobile.
- The Taiwanese lab must clearly state that AI singing phonetic experiments and loan-character spellings are not recommended Taiwanese orthography. Model version, melody, and vocal timbre may change results.
- Community `有效` / `唱錯` feedback and new-row suggestions enter a moderated pending queue. They must never edit the public seed catalog directly.
- Public clients have no direct Data API access to `ai_music_bible_contributions`. Submission goes through the same-origin server route, with validation, a honeypot, per-request-fingerprint rate limiting, optional signed-in attribution, and service-role-only database access.
- Indexed-entry comments require sign-in to read, create, or delete. The API validates every catalog key, authenticates bearer tokens with `auth.getUser`, rejects foreign-origin writes, resolves identity server-side, rate-limits signed-in writers, allows deletion only by the comment owner, and keeps `ai_music_bible_entry_comments` service-role mediated with RLS enabled.
- `/admin/ai-music-bible` is the owner-only editorial workbench for small canonical-content fixes. It can override prompt moves, lyric moves, and the 38 Taiwanese lab rows without changing keys or provenance; deleting an override returns that row to the TypeScript default. The override table is RLS-enabled with no browser-role grants, and server routes verify the bearer token plus owner email before reading or writing.
- The main Bible and Taiwanese catalog must keep working if contribution storage is temporarily unavailable; only feedback/submission should show a compact failure state.

Comment moderation:

- `/admin/comments` is the owner-only centralized desk for persistent Bar Heartbreak track comments, Choice collection comments, and Bible indexed-entry comments. Live room chat remains a separate transient surface.
- The desk supports author/body/target search, source and status filters, report-first review, target deep links, pagination, refresh, internal notes, hide, restore, report resolution, and two-step permanent deletion.
- Hide is the default moderation action: it preserves the row, moderator, timestamp, and internal note while removing it from public/member APIs. Permanent deletion is explicitly destructive and must require a second confirmation.
- Comment moderation tables are server mediated with RLS enabled and no anon/authenticated Data API grants. Owner actions authenticate bearer tokens with `auth.getUser` and owner email allowlisting.

## Drop Battle

Current behavior:

- Drop Battle uses a short drop cut rather than the full song.
- Drop Battle clips have a hard maximum of 60 seconds. Creators may cut shorter clips; the recommended public range is about 30-60 seconds so the hook/drop has enough time to reach its payoff without turning the battle into full-song listening.
- Drop Battle complete-song publication still requires the winning creator's explicit upload-time consent and an official result. Retiring Showtime certification grants no new full-song rights: without that consent, only the authorized Drop clip may be exposed. Complete audio must not be publicly playable by default or republished as a community song automatically.
- When complete-song publishing is enabled, the Battle Room still uses only the Drop clip; `Full Song` is an authorized post-result playback state, not a battle playback rule or certification.
- The complete-song decision is made during the original upload and is immutable for client-side edits. The upload form does not require a YouTube link yet; it only records whether the creator agrees to release the full work after an official win.
- After an official result, only the winning creator may submit or update a YouTube MV URL. The server verifies the official 3-voter result, winning queue ownership, and upload-time full-song consent before saving it; admins cannot replace the creator's URL.
- A submitted YouTube MV link is shown only on the official Battle Record and its corresponding authorized archived work. Historical Showtime links and authorized audio remain compatible; full-song playback still requires upload-time consent. The Battle Room remains Drop-only.
- Drop Battle quick start options are relative to successful battle-card publishing: `發布後 10 / 15 / 20 分鐘`. Custom start time is an absolute user-selected time and should not move with upload/cutting duration.
- `battle_queue.expires_at` is only a cleanup/expiry deadline. It must never be used as a Battle start time; opening time must come from `scheduled_start_at` or `cancellation_evaluation_at`.
- Fast start options must calculate the visible start time only after the queue/battle data has been successfully written. Do not pre-render a time label that ignores upload, cutting, or network duration.
- Automatic pairing must not inherit an old or stale `expires_at` value as tomorrow's start time.
- Shared Drop Battle links must enter the specific battle arena directly. If nobody has challenged yet, the arena must show the accept-challenge state; if a challenger already joined, the same link must enter the live/waiting arena.
- Public share URLs should stay short: Drop arena uses `/b/{shortId}`, Drop result card uses `/r/{shortId}`, 24H queued card uses `/d/{shortId}`, and 24H live battle uses `/h/{shortId}`. These routes may redirect internally to the canonical full route.
- Drop Battle share preview images should be black background with the white AIPOGER logo as the main visual.
- Open Drop Battle arena links are publicly enterable. Anonymous visitors may vote, send arena danmaku, and tap feedback/reaction buttons inside the Battle arena only.
- Accepting a challenge, uploading a challenger Drop, opening a new Battle card, cancelling a creator-owned Battle, and claiming a rematch slot still require sign-in.
- Anonymous Battle arena access does not change Bar Heartbreak rules: Bar Heartbreak listening stays public, but reactions/comments/uploads/removals still require sign-in.
- The Battle Pool is an index, not the destination for a shared arena link. Legacy `focusBattle` / `focusQueue` URLs should redirect to `/battle/[id]`.
- If a shared `/battle/[id]` link points to an already-ended Drop Battle with no active rematch, send the visitor to Bar Heartbreak (`/listen-bar`) instead of the Battle Pool or a dead arena.
- If the ended Drop Battle still has an open/claimed/uploaded rematch path, keep the visitor in the battle flow: stay on the source arena for open/claimed rematch, or redirect to the next battle when `next_battle_id` exists.
- The same battle/match group should appear only once in the Battle Pool, even if both fighters have queue rows.
- Both participants in an unfinished Drop Battle should be able to cancel from the arena or eligible Battle Pool card.
- Finished Drop Battles open a short king-of-the-hill rematch window only after the result is official: at least 3 distinct audience voters, a valid winner, no existing next battle, and a formal Drop Battle type. The window is 5 seconds to claim the challenger slot, then 120 seconds for the challenger to upload their Drop.
- If nobody claims the 5-second rematch slot, the battle should go directly to the result card and should not leave a lingering rematch card.
- A battle with fewer than 3 distinct audience voters (0-2) is audience-insufficient / no contest: it must not create a result card, update official song battle stats, write win/loss history, or open the defender/rematch window.
- A battle with at least 3 distinct audience voters is an official Drop Battle result and may create an official archive, update per-song battle stats, and open the defender/rematch window. It does not grant certification or monthly chart points.
- The official-result audience threshold counts distinct listeners only: one signed-in `battle_votes.user_id` or one anonymous `battle_guest_votes.guest_id` per battle. Fighter participation does not count toward the 3-audience minimum.
- A user may hold one active Drop founder/open-card intent and one active Drop challenger intent at the same time.
- A creator may deliberately challenge their own open Drop Battle card when they want listeners to compare two same-genre songs from the same account. This is only allowed through a specific target card; automatic random pairing should not auto-match the creator against themself.
- Drop Battle and 24H Full Song can coexist for the same account; their active limits are separate.
- Drop Battle challenge cards expire automatically after at most 24 hours and are cancelled by cleanup.
- Open Drop states include `searching`, `waiting`, `waiting_challenge`, `public_voting`, and `ghost_battle`.
- If no immediate same-genre opponent is available, the user may open a Drop Battle challenge card or go to Bar Heartbreak to find listeners/opponents.
- Duplicate active Drop audio should be blocked by audio hash when the column exists.
- The Battle Pool genre filter shows only the fixed music genres. It must not show `全部風格` / `All Styles`; the default unselected state still displays all official Gatekeeper Drops and open Battle cards.
- Clicking an already selected Battle Pool genre clears the selection and returns to the unselected all-content view.
- The Battle Pool first viewport is a compact working stage, not a poster or dashboard. Its quick navigation order is `Explore Music`, `Bar Heartbreak`, `Battle Records`, `Showtime`, and `Drop Rules`; share remains a separate command. Fake waveforms, decorative play controls, deck/EQ decoration, and oversized navigation cards must not push the public challenge pool below the first viewport.
- Battle Records / 對戰記錄 must not preserve under-threshold battle outcomes. Public result cards require the official 3-distinct-audience threshold.
- Historical Showtime Battle records and their authorized audio remain preserved. New official Battle results belong to Battle Records; Showtime monthly charts never consume Battle results as ranking inputs.
- Battle history should focus on the song, not the fighter profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- V1 song battle stats do not open arbitrary URL upload or a full creator song-library UI. The only external link exception is the narrow post-win YouTube MV release link described above.
- Waiting cards should provide a `約人鬥歌` share action.
- Live or public-voting cards should provide an `邀請觀戰投票` share action.

### Q Crash / 非同步 Full Song Battle

- `Q Crash` is the asynchronous Full Song Battle mode. Existing live Drop Battle remains unchanged.
- The public promise is: `兩首完整歌曲，不用等人到齊，讓大家在自己的時間決定哪首歌勝出。`
- Every Q Crash has exactly two work seats, A and B. The same creator may intentionally compare two own versions, or a second creator may accept the shared/targeted invitation and lock their own work into seat B.
- Q Crash does not crop audio. Each work is a complete Track supplied either as a public HTTPS Suno link or as an uploaded MP3/WAV. Q Crash does not require matching genres: each work keeps its own fixed genre tag for display, search, and later analysis, while voting starts only after two distinct queue/work entries are locked.
- Q Crash stores one unified Track contract: `source_type` is `suno` or `upload`, `source_url` stores the public Suno link or the private Storage object key, and `title`, `creator`, `cover_url`, and optional `duration_seconds` describe the work. A Suno source is resolved at runtime through the public page's media metadata and Suno's anonymous playback-rights handshake; the Q Crash same-origin player decrypts the encrypted stream just in time in memory when needed. AIPOGER never persists, stores in Storage, transcodes, or crops the Suno audio. If the public media source or playback-rights handshake cannot be resolved, the work is unavailable for playback and must not silently send the listener to Suno. Uploaded audio stays as the original full file.
- Every Q Crash submitter must confirm `I confirm that I created this track or have permission from the rights holder.` before the server records the work.
- Each work may attach its own JPG, PNG, WebP, or GIF cover during the Q Crash upload flow. The cover belongs to that submitted queue/work, is copied to the matching battle side, and must not be inferred only from the creator's current profile cover; if no work cover is supplied, the profile cover remains the fallback.
- Same-title works display explicit `版本 A` / `版本 B` labels. Results are work-first: winner storage uses the winning queue/work identifier, and the creator is read from that work.
- Q Crash voting windows are `30 minutes`, `2 hours` (default), `12 hours`, or a custom window from 30 minutes up to 3 days. The server sets `voting_ends_at` when work B locks; neither creator may extend or edit the deadline afterward.
- A pending invitation expires after 24 hours. Creator cancellation or expiry produces no public vote, result, stats, or history.
- Guests may open the card, listen to both full songs, choose their own listening duration, see time remaining, and share. Voting requires sign-in and must return the listener to the same Q Crash card after auth; no complete-song, minimum-seconds, or playback-completion threshold is required.
- A guest's selected A/B choice is a local draft and must survive the sign-in round trip. Returning from Email, Google, or Facebook auth must use a full-page navigation to the exact Q Crash URL; the return target is cleared only after that destination has actually loaded. The restored choice is never auto-submitted.
- Each signed-in non-participant account gets exactly one immutable vote per Q Crash. Work owners cannot vote, including a creator who owns both A and B.
- Selecting work A or B is a reversible client-side draft, not a submitted vote. The listener may replay, seek, or switch sides until pressing the explicit confirm-submit control; only that confirmation writes the sealed vote, and the submitted vote remains immutable.
- The explicit confirm-submit action stays in a fixed, high-contrast vote dock while voting is available. It must remain visible with or without the fixed A/B player, clearly distinguish selection from submission, and change to `登入並投作品 A/B` for signed-out listeners.
- Before confirming the vote, that audience account may optionally enter one comment of at most 120 characters; the comment and A/B vote are written in the same confirmation action. After submission, the comment cannot be added, edited, or deleted. While voting is open, comments remain sealed; all visible voter comments are revealed only after settlement, so comments never expose an audience count or momentum signal before the deadline.
- Q Crash comments are qualitative context only. They do not change the winner vote, five-axis feedback, official audience threshold, Battle record, or monthly chart score.
- Q Crash votes remain in a server-only sealed vote store while voting is open. No visitor, participant, or host may see counts, percentages, total voter count, a leader, or another signal that reveals the result before the deadline.
- Owner analytics may privately record an estimated, session-deduplicated Q Crash funnel: opened, played both works, selected A/B, encountered sign-in, and confirmed submission. Playback analytics are guidance only and never a voting requirement. These live engagement counts are owner-only and must never leak into the public card, participant card, API payload, comments, or pre-deadline result UI.
- Winner voting and five-axis feedback are separate actions. Each of the five feedback keys (`rhyme`, `impact`, `melody`, `emotion`, and `structure`) may be selected once per work by each signed-in non-participant account; every selection is immutable, and work owners cannot submit feedback.
- Open-card feedback is private to the current listener. Before settlement, the public/API surface may show only which keys that listener already selected; it must not return aggregate feedback totals, comparisons, progress, or a winner-shaped radar.
- The server/cron settles from `voting_ends_at`; browser time is never authoritative. After settlement, 0-2 distinct signed-in non-participant listeners is audience-insufficient/no result. At least 3 establishes an official Q Crash result.
- Official Q Crash results copy the sealed votes into the existing official Battle archive/stat path, save `winner_queue_id`, archive both works' five-axis feedback, and show the winning work's pentagon distribution. Insufficient results publish no feedback radar and update none of those official paths.
- Official Q Crash archives appear in Battle Records as a distinct cyan `Q Crash 戰報` section and link back to the same interactive Q Crash card (`/b/{shortId}`), so the public can replay both works and continue the post-result conversation.
- After an official result, a signed-in non-participant may record a separate A/B preference. It is replaceable, may be counted publicly after settlement, and never changes the sealed winner vote, five-axis feedback, audience threshold, song stats, Battle history, or monthly chart score. Work owners cannot submit it.
- Legacy Battle archives without an explicit public source marker remain stored for recovery and analytics but are hidden from the public Battle Records list. New formal Drop Battle archives must write `source: drop_battle`; Q Crash archives write `source: q_crash`.
- Official ties reuse the stable formal Drop Battle tie breaker. Creator identity never changes the winner rule.
- Q Crash V1 does not open the live rematch window. A repeat comparison creates a new Q Crash.
- Public sharing uses the existing `/b/{shortId}` Battle arena link once voting starts. Both work owners share the same battle ID and card; the system must never clone a second card for the second creator.
- Q Crash sharing copy should sound like a real friend asking for a listen, for example `這兩首歌到底哪首比較好聽啊？我有點選不出來！進來聽完整歌曲，幫我決定哪首勝出！`; avoid formal system copy such as `不用等人到齊，決定哪首歌勝出` as the primary share invitation.
- Q Crash language behavior is intentionally simple: `zh` uses Traditional Chinese; `en`, `ja`, and `ko` all use English copy and English share metadata. The shared URL must preserve the selected display language policy so the recipient sees the matching copy and controls.
- Battle Pool renders one Q Crash matchup card per Q Crash card/battle ID. Its A and B queue rows must be removed from the ordinary waiting-card list so one battle never appears as two separate cards.
- Battle Pool visually separates the modes: Q Crash matchup cards live directly below the Q Crash introduction in a blue/cyan section, while official and public Drop Battle cards stay in their own red/orange `Drop Battle 公開挑戰池` section. Genre filters belong to the public Drop section and do not hide Q Crash cards.
- Account limits reuse Drop roles: opening Q Crash occupies the founder state; a different creator accepting seat B occupies their challenger state. When one creator owns both works, Q Crash occupies only that creator's founder state.
- Front-stage UI stays hot and DJ-battle-led: desktop uses two side-by-side work seats, mobile stacks them, every work exposes a lyrics HUD with a clear `歌詞未提供` state, and one fixed bottom player switches between A and B. Do not render Q Crash as a survey, leaderboard, or plain poll card.
- Owner-only `/admin/q-crash` is an editorial workbench for each Q Crash work: the owner may replace or remove its display cover and attach one external HTTPS complete-version link. It must show one combined A/B Q Crash card, lock edits while voting is open, keep a stable private Storage cover path, and write an audit row for every change. It must never edit the submitted full-song source, votes, five-axis feedback, winner, official audience count, stats, or Battle archive.
- The complete-version editorial link is hidden during pending, joining, and voting states and becomes visible only after an official `q_crash_finished` result, on the Q Crash card and Q Crash section of Battle Records. It opens the external page in a new tab; it is separate from the submitted source and never replaces the shared in-app full-song player during active voting.

Official Gatekeeper Drops:

- AIPOGER may keep up to four owner-managed official Drop challenge templates in the Battle Pool.
- These official cards are templates, not normal `battle_queue` rows. They must not be consumed or disappear when someone challenges them.
- Only owner/admin accounts can upload, update, enable, or disable official Gatekeeper Drop audio, cover art, and lyrics.
- Owner/admin does not set a start time for official Gatekeeper Drops. The official song stays there as a standing gate.
- Owner/admin must choose the official Gatekeeper Drop genre from the same standard genre menu used by Battle upload. Do not use free-text genre entry for these cards.
- Official Gatekeeper Drop audio accepts standard AIPOGER audio formats with a 100MB single-file limit. The owner/admin upload flow must use the same 60-second Drop cropper used by normal Drop Battle.
- Official Gatekeeper Drop cover art accepts JPG, PNG, and GIF with a 10MB single-file limit. Lyrics are optional and stored with the official template.
- Production must have `supabase/20260618_official_gatekeeper_drops.sql` and `supabase/20260619_official_gatekeeper_media.sql` applied before audio, cover art, and lyrics can all be saved.
- Public cards should say `歡迎任何人來挑戰 AIPOGER 官方關卡`, show the actual song name, `GATE` number, and genre/type badge, and avoid wording like `官方守門戰：傷心酒吧`.
- The official Gatekeeper Drop card section must not repeat a separate heading/subheading such as `官方 DROP 挑戰` / `歡迎任何人來挑戰`; the card itself carries the gatekeeper context.
- The card guidance copy should highlight `歡迎挑戰這首官方 Drop，設定開戰時間並分享拉人投票。看看你的歌能不能打`.
- The `挑戰這首 Drop` action should sit in the same action row as `5 秒預播`.
- Public official Gatekeeper cards should only expose the same 5-second teaser behavior as normal Battle cards. Do not show full audio controls or let visitors play the whole stored Drop from the Battle Pool card.
- Official Gatekeeper Drop lyrics do not need to expand on the Battle Pool card. Lyrics may remain stored on the template and copied into the created Battle Room, where listeners can view them in context.
- A challenger can choose the start time using the normal Drop Battle schedule rules: quick 10 / 15 / 20 minutes after successful battle creation, or a custom time within 24 hours.
- When a challenger submits, the system creates a per-challenge battle instance: one copied official defender queue plus one challenger queue. Official audio, lyrics, and cover art must be copied into the defender side so the created Battle Room behaves like a normal Battle Room for listening, lyrics, cover display, watching, and sharing.
- The copied official defender queue must not count as the owner's personal active Drop Battle intent, must not notify the owner as if they personally entered a battle, and must not pollute owner-facing active battle limits.
- The challenger side counts as an active challenger intent until that battle ends or is cancelled. Owner/admin may also challenge their own official Gatekeeper Drop; the copied defender side still must not count as a personal active founder intent.
- Official Gatekeeper Drop results follow the same audience threshold rules as normal Drop Battle: 0-2 distinct non-participant voters audience-insufficient/no result, 3+ distinct non-participant voters official. No result grants Showtime certification or monthly chart points.

Initial operating target:

- Public Drop challenge cards should be limited to 10 open cards across the platform.
- This is a product target and should be enforced before upload or before Battle queue insert, so storage and UI do not fill with stale challenges.

## 24H Full Song Battle

Current visibility:

- 24H Full Song Battle is currently hidden from the front-stage product.
- Do not present 24H Battle as a primary gameplay mode in pitch decks, public onboarding, homepage copy, or new-user explanations unless the user explicitly reopens it.
- Keep the implementation rules below as retained system behavior, not as current public positioning.

Current behavior:

- 24H Full Song uses the complete uploaded song.
- Each account can keep only one active 24H Full Song entry at a time.
- `queued`, `matched`, and `live` 24H entries block starting another 24H entry.
- `finished`, `cancelled`, and `expired` 24H entries release the account to start another 24H entry.
- 24H Full Song is not limited to one per calendar day.
- 24H queued entries can be accepted by another creator.
- Retain actual settled 24H winner records and historical authorized audio; they do not grant new Showtime certification or monthly chart points.
- Duplicate active 24H audio should be blocked by audio hash when the column exists.
- 24H queued cards should share with `/d/{shortId}` and 24H live battles should share with `/h/{shortId}`.
- Battle history should focus on the full song entry, not the creator profile. Cards may show per-song challenge count, wins, losses, ties, and win rate.
- Queued cards should provide a `約人鬥歌` share action.
- Live cards should provide an `邀請觀戰投票` share action.

Initial operating target:

- `queued + live` 24H Full Song battles should be limited to 10 active battles across the platform.
- Count both queued and live because live battles hold space for 24 hours.
- This limit is about flow control and bandwidth, not only storage size.
- The user-facing message should be direct: `目前 24H Full Song 鬥歌場已滿，請稍後再來。`

## Bar Heartbreak

This section is the authoritative Bar Heartbreak rule set. Historical detailed design is retained through the old document redirect.

Current rules:

- Bar Heartbreak main rotation contains creator submissions only.
- Official AIPOGER songs do not count as active public-pool songs.
- If there are no community submissions, hidden fallback store music may prevent a silent station; it must not appear as a creator submission.
- Public listening supports 15 playback choices: all public airplay plus the 14 fixed music genres.
- Confirmed 2026-09-20, taxonomy released; audio suggestion worker activation pending: add `Children's Music 兒歌`, `Latin / Reggae 拉丁雷鬼` (Latin, Reggae and Reggaeton together), and `Cinematic 電影配樂` after the original 11 values. Preserve existing `/l/1` through `/l/11` links; new shares are `/l/12` through `/l/14`. Existing songs and frozen chart entries are not reclassified.
- On the Profile community submission form, selecting an audio file requests optional genre suggestions using up to 21 seconds from different parts of the actual audio. Show up to three current canonical genres. The uploader alone chooses the final genre: only an explicit accept click fills it, and the menu remains editable. Embedded metadata must not silently select a genre. New files cancel/discard stale analysis; analysis never changes a manually selected genre, grants eligibility or consumes submission quota. Declining, silence, undecodable audio, timeout, unavailable service or uncertain output must leave manual submission usable. Never display model similarity as accuracy or probability. Excerpts are temporary and not publicly served or retained in the catalog.
- New submissions must include a fixed music genre. Do not silently default missing genre values to `Original 自我風格`.
- New Bar Heartbreak audio submissions accept MP3, M4A, AAC, or OGG only, with a 30MB single-file limit. Do not accept new WAV or AIFF submissions in the public or admin Bar Heartbreak upload surfaces.
- Bar Heartbreak is the continuous radio inside Explore; creators submit from Profile, with owner curation after publication. Publication does not require owner/judge review. The submitting creator confirms playback in the preview before confirming submission.
- There is no per-genre or total library capacity. Genre controls show actual publicly playable track counts, never capacity denominators.
- New eligible submissions enter public airplay immediately. Challenger admission, seat limits, 36-hour protection, survival days and automatic capacity elimination are retired.
- Creator uploads (updated 2026-10-13): ordinary members receive three free own community song submissions in a personal 168-hour window, shared by link and audio-file submissions. The first successful submission starts the window; at expiry, the next successful submission starts a fresh window. No calendar-Monday reset or carryover. Deleting, hiding, or changing display status never refunds quota. Failed/rolled-back submissions, previews, metadata edits, listening, favorites, and Choice selection do not consume it. The Owner is exempt from all submission-count limits, verified against confirmed primary Auth email and the existing owner identity list, never editable profile/metadata claims. Owner community submissions still use the caller's RLS identity and preserve ownership, genre, rights/preview and duplicate checks. No per-creator/per-genre active-song inventory cap remains; submitting in one genre across multiple weeks is permitted. Existing songs and quota history remain intact. Official-library uploads remain outside the community allowance. After the first three free submissions, a successful extra work costs 60 Credit with explicit confirmation and no outstanding debt; the database rechecks funds atomically.
- Existing active, visible Challenger records become public without modifying creation time, audio, reactions or recognition. Previously hidden/removed/rejected works are not restored.
- Both GET and POST `/api/listen-bar/process-rotation` are inert compatibility responses, even if an old environment flag or caller remains. Vercel no longer schedules rotation. Database `process_listen_bar_rotation_limits()` is also inert; explicit creator/owner/admin/moderation removals remain supported.
- Previously Showtime-certified community songs that are public, playable and within the current three-month pool remain in Bar airplay and appear on Explore using the original track ID, audio, Hearts, favorites and comments. Historical certification never excludes them from either listening surface. Explicit `ai_music_showtime_public_removed_at` and all existing hide/removal/moderation restrictions still apply. No duplicate upload or new publication time is created.
- Battle-only archives do not become `listen_bar_tracks` automatically: clip-only, audience-insufficient and nonpublic full-song records must never be republished as full tracks.
- Returning historical Showtime songs are not relabeled NEW. Reset their challenge state to showcase/closed; only the creator's explicit opt-in after that reset, with a prepared defender Drop and the normal eligibility checks, may reopen challenges. Do not infer consent from an old `open` value or historical recognition.
- The owner may hide/unhide or soft-remove tracks through the existing admin console without writing a custom review. The system records its standard action note and preserves recovery data. No unrelated existing tracks are removed during this release.
- Submission copy explains immediate publication, three calendar months of public promotion and ongoing owner curation; no permanent listing guarantee or room-message invitation. Questions and discussion use each original work's comments.
- Per-track comments remain persistent and require sign-in. Playback is a personal queue, independent of other listeners.

- A listener must sign in to press Heart or comment. Pressing Heart on a Bar Heartbreak track creates that day's active Heart and saves the track to the listener's favorites; re-pressing Heart cancels both. Removing it later from favorites in Profile remains a separate saved-song action and does not cancel or recount the active Heart reaction.
- Profile `收藏歌曲` is the user's saved-song manager. It should support batch selection and batch removal of saved favorites, while keeping historical Heart reactions intact.
- Creator and listener accounts use the same fixed bottom queue player for Profile saved songs. Each saved-song row exposes one play action; play/pause, seek, previous/next, mobile volume, and close controls live in the shared player. Do not bring back invisible playback or separate native audio controls inside saved-song rows.
- Profile overview lists four songs per page; its complete legacy creator-song manager retains pages of 10. Profile creator-song management for the user's own Bar Heartbreak songs should support batch selection and batch removal from the public/battle surfaces through the creator-owned remove flow.
- `Profile / 我的作品` is the single metadata editor for all of a creator's community songs, including previously certified works; remove the separate locked Showtime-work editing split. Creators may edit their own cover and permitted display metadata, lyrics, YouTube and external support links under existing validation/review rules. Metadata edits never replace audio, alter ownership, rewrite historical recognition, actual Battle wins/losses, votes or Hearts, reset publication age/upload quota, restore removed works, or change challenge consent. Challenge settings remain a separate explicit action in the same own-works area; pending-battle Drop locks still apply.
- Bar Heartbreak's old room-message surface is retired. Historical room-message APIs and cleanup retain the same 24-hour cutoff in database and storage fallback; they are not a current public interaction surface.
- Explore AI Music cards sourced from Bar Heartbreak retain the same total Heart data and original reaction path. Total is available in the button tooltip/accessibility text; the popularity chart shows distinct non-author supporters as a separate metric.
- Bar, Explore, Showtime/Choice and Profile saved music use one root-mounted player. Choosing a song or genre starts a queue snapshot; navigating between pages does not replace or pause it. New uploads appear in the library immediately and enter a newly selected queue; timed priority insertion is retired. Bar repeats its selected genre (including a one-track genre), while finite playlists stop at the end. Previous follows listening history within the session. Seeking/skipping never sends a vote or removes a song.
- Bar Heartbreak upload metadata should stay compact: user-entered creator name, AI tool, and album/mood are limited to 12 CJK characters or about 24 English characters; one-line song description is limited to 16 CJK characters or about 32 English characters. Auto-detected song titles are not subject to this compact metadata limit.
- Bar Heartbreak submissions may include one optional YouTube MV URL. The public now-playing metadata row shows it only as a compact `看 MV` / `Watch MV` action; it must not replace audio playback or interrupt the radio. Creators can add or edit this URL from their own track detail form, and admins can edit it from `/admin/listen-bar`.
- `/admin/listen-bar` track management must use a dropdown filter for the fixed 14 music genres. Do not bring back a primary `待補類型` filter, badge, or empty state for normal admin management. Upload preview and every track card expose only one play action and route audio through one fixed bottom preview player with play/pause, seek, volume, and close controls; switching songs replaces the shared player instead of leaving native audio controls inside cards. Metadata and bulk-metadata saves must preserve the current visibility, genre, month, search, sort, and page view, especially when the owner is reviewing by upload time. `/admin/listen-bar` track management paginates songs at 10 per page; `選取本頁` applies only to the current page while accumulated selected songs can still be processed in bulk.
- `/admin/listen-bar` opens on active/on-air songs only, and names that primary view `全部上架`. Hidden songs are available through `只看下架`; removed songs are excluded from both views and available only through the dedicated `已移除` filter, where restore remains available. Do not add a duplicate `隱藏下架` view. A song whose `created_at` is within the rolling seven-day window shows `NEW`; metadata edits must not restart that window. The owner-only `promotion_checked_at` checkbox records whether external promotion has been recorded and completed; it is separate from `promoted_at`, which records public-pool promotion.
- Daily Spotlight 已退役；`/today` 固定導向 AIPOGER Choice，傷心酒吧不再讀取或指定 Spotlight 歌曲。


- Legacy Bar Heartbreak short shares `/l/all?lang=...` and `/l/{genreIndex}?lang=...` remain valid and end on Explore with that radio genre selected.


Monitoring and automation baseline:

- Do not schedule Bar survival promotion or removal. Compatibility endpoints and RPC return zero mutations.
- Explicit creator/admin/moderation actions are permitted; automated capacity eviction is blocked at the database boundary.

Product language:

- Use listening, tracks and genre wording; do not present Challenger seats or survival status.
- Avoid implying Bar Heartbreak is a ranking chart.
- Bar Heartbreak is a continuous AI music listening space, not a daily survival game.
- On a first visit with no explicit URL language or saved preference, use Vercel country geo defaults: `CN` / `TW` → Traditional Chinese, `JP` → Japanese, `KR` → Korean, and every other country → English. A manual language choice is saved in the `aipoger_lang` cookie and always wins over geo detection. If country geo is unavailable, use the browser language only as a fallback.

## Explore AI Music / AI 音樂作品

The homepage first-layer low-pressure entry is `探索 AI 音樂`, linking to `/ai-music`.

Surface positioning:

- Bar Heartbreak is Explore's continuous radio. Creators submit in Profile; eligible three-month public works rotate by genre and appear in the same Explore catalog.
- Explore AI Music is the public uploaded-works wall. It is catalog mode for public uploads that meet display conditions, not a certification surface.
- Showtime is the monthly charts and Choice surface, not a certification archive. Public playable community works, including historically certified and founder-migrated songs, remain discoverable on Explore and Bar while within the current three-month pool; history retains its own display rules. Chart placement or Choice selection neither grants nor removes challenge eligibility.

This page is the AI music works browser. It should:

- Use the main title `探索音樂`, subtitle `找到對味的歌，讓好作品被聽見。`, and shared black/orange editorial header: 精選 → 探索音樂 → MV → Showtime → Battle → 創作聖經. Logo returns home, submission opens Profile, sign-in returns to Explore; signed-in account/owner/notifications remain available without duplicate guest chrome.
- Place the compact Bar Heartbreak player above the title; put search beside the desktop title and stack clearly on phones. Search the complete current eligible catalog by title, creator or AI tool, intersect genre, preserve IDs and show all matches beyond collapsed lanes. No-match offers reset; read failure never claims zero songs or votes.
- The Earworm taste mix is one compact `為你推薦` row with up to four works: three main/nearby picks and one discovery pick, filling from remaining eligible works when needed. Exclude those IDs from lower lanes without changing original queues/order. No taste profile means real genre lanes and test entry, never fabricated recommendations.
- Keep `更多音樂` and actual genre lanes immediately below the recommendation row. Footer catalog count uses the complete eligible catalog and current 14 genres; the first screen is cover-led, with no large decorative hero or nested taste panel.
- The shared `/guide.png` action is in each listening/Showtime/Battle local control strip, with text and icon. Its accessible dialog preserves X, Escape, backdrop close and focus trap/return, explaining the current surface and member Credit. Public copy does not disclose the temporary expired-return +5 popularity boost or the unique Owner Credit exemption; both actual behaviors remain in force and are documented internally.
- Within the works browser, provide `依曲風 | 正在升溫` / `By Style | Hot Now`; genre remains the default and preserves rolling seven-day NEW ordering. Both use cover cards, two columns on phones, three on narrower screens and four in the right desktop gallery; desktop covers use the reference crop, mobile covers are square. At 320px the genre selector receives a separate full-width row. Do not turn Hot Now into a wide rank table, Showtime, Choice, or an absolute cross-genre music score. Filters retain a work's original global Hot Now rank; they do not re-rank the subset.
- Hot Now / 正在升溫 only uses explainable 7-day signals from real data: distinct account Heart supporters first, audience votes from officially established Battles second, latest qualified interaction third, then `created_at desc` and `id desc`. It must not use all-time Heart totals, unverified play counts, mock values, or an opaque Heat Score. Official Battle votes count only when the archive meets the 3 distinct non-participant audience threshold.
- Hot Now includes otherwise eligible historically certified works without a gold `SHOWTIME` certification badge. Its existing recent-discovery ordering is separate from the monthly Heart-only chart and must not be reused as monthly scores or ranks. Works with no recent valid signal stay at the bottom as `正在累積` / `Building recent support` and receive no fabricated rank number. Existing recent-order markers must remain scoped to Hot Now. Hidden, removed, moderation-held, Explore-retired, invalid-genre, inactive, or unplayable works remain excluded; challenge actions follow current explicit creator consent, not certification history.
- Do not show internal verification wording such as `真實資料，不含 mock` or `Real records only` in the public page UI.
- Group real works by the current 14 fixed music genres.
- Show at most 4 works per genre before `看更多`; search displays all matches, and expansion also exposes additional NEW works from the same creator even when a compact lane contains fewer than four cards.
- No standalone `最新上架` / `New Arrivals` / `72 小時新歌` shelf, section, route, independent `看更多`, or category label may be added to Explore. The rolling seven-day NEW window is both the badge and sorting window: eligible NEW works lead their own genre lane, and lanes with NEW works lead the wall by their newest NEW `created_at desc`; lanes without NEW works retain the fixed 14-genre order. A work uses `created_at`, then `id desc` for same-time stability. Never use `updated_at` to restore NEW exposure after metadata edits.
- Within a genre lane, NEW works sort new-to-old before established works. Established works keep public positive-reaction priority, then `created_at desc`, then `id desc`. In the collapsed first 4 cards, one creator may expose at most one NEW work in that genre; their other NEW works remain in the same lane's `看更多` result. This compact-lane rule does not hide the work, suppress established high-reaction works, or affect the expanded list.
- Only display-eligible three-month works participate. Data refreshes each minute and when returning to visibility/focus, but original user filters, expansion and location are preserved; do not reset search or scroll on refresh.
- Keep cards music-platform-like: cover, title with large orange Heart and white comment icon, creator immediately below; no extra control row. Total Heart data remains in tooltip/accessibility text. AI tool remains metadata/tooltip. Information reveals actual challenge counts/W/L, sharing preserves the original ID, and challenge-ready cards retain `攻擂` beside creator metadata.
- Challenge-ready cards must show a red angled `接戰` corner badge on the cover's top-right. This badge means the original creator is ready to accept a challenge; it is not the attack action. The bottom `攻擂` button remains the challenge action.
- Show the `接戰` badge only when the work is visible on Explore, playable, not retired or hidden/removed/moderation-held, the creator explicitly set the track to `等人挑戰`, and a defender 60s Drop is prepared. Previously certified works require fresh creator opt-in after the retirement reset. Do not show the badge for showcase/closed/custom-only works, missing defender Drop, retired works, or unplayable/incomplete tracks.
- A compact `NEW` badge lasts for the rolling 7 x 24 hours after `created_at`, and the same window controls Explore's NEW-first work and genre-lane ordering. `updated_at` must never restart either display or ordering. On Explore, `NEW` sits at the cover's top-left while the red `接戰` keeps the top-right; both remain readable on desktop and mobile. Bar Heartbreak shows the same visual state on the now-playing cover, without changing Bar rotation rules. Do not label this state `Weekly`, because that wording belongs to AIPOGER Choice Weekly. This does not create a new-song shelf, route, category, or independent `看更多`.
- Heart buttons on cards and the mini player may light for the signed-in viewer when that viewer has an active Heart for the current Asia/Taipei day. Re-pressing the lit Heart cancels that day's Heart and its synchronized favorite; this remains private state feedback, not a public favorite/count UI.
- Open Battle HUD details explicitly through the information action on desktop/mobile; desktop hover or keyboard focus reveals compact info/share controls, and phones keep those controls visible. This protects cover visibility without removing actual Battle history.
- Card playback uses the same root audio shown by the inline radio when visible and fixed bottom dock otherwise; never add per-card audio elements.
- The fixed bottom mini player must include a draggable playback progress bar with time labels, plus a lyrics action that opens lyrics as a HUD-style popup above the player. The lyrics HUD should scroll independently and include a side slider for scrubbing through the lyrics; missing lyrics should show a compact `歌詞未提供` state.
- Keep `Drop Battle` / `AI 音樂鬥歌場` as internal options from this page, not the homepage first-layer primary entry.
- `台語熊high` is a current fixed music genre. Treat old spaced labels such as `台語熊 High` only as aliases into `台語熊high`; do not display `City Pop / Disco / Funk 城市律動` or `心靈 Ambient 宇宙` as current category names.

If a source track does not explicitly allow direct challenge, it may be played, hearted, and shared, but it must not be presented as directly challengeable.

Explore direct challenge loop:

- Explore AI Music works that can be challenged come from the AI music public airplay / Bar Heartbreak `listen_bar_tracks` data flow, not from the old standalone Drop challenge pool.
- Creators manage each public-pool track's challenge state from Profile: `僅展示` / showcase, `等人挑戰` / open, or `自定開戰` / custom.
- `等人挑戰` requires the creator to prepare or select a defender 60s Drop first. If a track has `open` status but no prepared defender Drop, `/ai-music` must not light the challenge button and Profile should show `尚未準備守擂 Drop`.
- Open Explore challenges always use the 60s Drop Battle cropper. The challenger selects or uploads their own Drop, sets the start time, and sends an invite to the defender.
- When the challenger sends the invite, the system locks the defender's current prepared Drop by copying that Drop into the battle/queue rows. If the track has a pending attack invite, the defender cannot replace the prepared defender Drop.
- The created battle starts in a pending defender-acceptance state. While pending, the battle room allows both sides' 5-second previews and arena sharing, but voting is closed.
- Creating an Explore attack invite must write an in-app `battle_notifications` account notice for the defender. The right-top / 右上角通知 dock shows a red dot or unread number and must open a readable account-notice card; Explore attack invites route the defender to `Profile / 我的作品` -> `待接戰`.
- `待接戰` cards show the track title, challenger, genre, scheduled start time, defender 5-second preview, challenger 5-second preview, Accept, and Reject. The matching track row must also show that the defender Drop is locked while the invite is pending.
- Email is auxiliary only. It may point the defender back to AIPOGER, but it must not be the only notice path and must not contain direct accept/reject actions.
- Pending invites expire if the defender has not answered by the scheduled start time. Expired, rejected, under-threshold, or unstarted invites create no result and no win/loss for either side.
- The same challenger may not keep more than one pending Explore attack invite against the same track.
- If the defender rejects, the challenge ends without result, stats, or win/loss history. If the defender accepts, the battle starts according to the scheduled time.
- A challenger may send at most 6 Explore attack invites per Taiwan day.
- Explore direct-challenge official records require at least 3 distinct non-participant audience voters. Ties go to the defender (`fighter_a`). Under 3 voters displays audience-insufficient/no result.
- Six-defense certification is retired. Official defenses still retain their actual Battle outcomes, but no count triggers promotion, a badge, or removal from Explore/Bar. Preserve historical defense/eligibility data internally; do not present `0/6`, a certification progress bar, or a promise to enter Showtime.
- `/ai-music` keeps actual song battle wins/losses and challenge history available in its HUD. Never reset or fabricate Battle outcomes to retire certification or establish a chart.
- The existing 8-official-loss Explore retirement policy is not newly changed by this release: for tracks historically subject to it, 8 official losses retire the work from the public uploaded-works wall and stop challenges. Only battles with at least 3 distinct non-participant voters count; rejected, expired, under-threshold, or unstarted invites do not. Preserve the historical exemption for previously certified works using retained eligibility data; removing active certification must not silently extend the 8-loss policy to them. Main implementation work must preserve that boundary unless separately authorized. Neither this exemption nor chart eligibility implies challenge opt-in.
- The original Drop Battle Pool remains for temporary/open-card matchmaking and quick Drop Battle entry that does not start from Explore AI Music.

Drop cutting keyboard rule:

- The Drop cropper may keep Space as play/pause only when focus is not inside a text-editing target and no meta/ctrl/alt modifier or IME composition is active.
- Space must enter a normal blank character inside lyrics textarea, song title input, creator input, AI tool fields, genre select, notes/description fields, contenteditable areas, or `role="textbox"` widgets. It must not call `preventDefault` or toggle playback in those cases.

## Earworm / 耳朵蟲

Earworm is AIPOGER's ten-track music personality test. It is a listener discovery and recognition-data surface, not a formal Battle, ranking, or same-genre winner declaration.

- One test contains exactly 10 public, playable community works. Sampling should cover different current fixed genres before repeating a genre or creator.
- During the test, the genre label stays hidden. Reaction controls are available immediately: a first impression is valid, with no minimum listening time. Each work attempts automatic playback; choosing a reaction advances and starts the next work automatically. A visible `下一首` action records `無感` and advances immediately. If browser autoplay is blocked, show a direct resume-playback control.
- The result appears only after all 10 works have an answer. It shows one current primary listening direction, two nearby genres, and listening keywords; copy must say `目前最接近` rather than presenting a permanent psychological identity.
- Result actions use one top-to-bottom decision path: `去探索音樂`, `去傷心酒吧`, `看看為我挑的歌`, sharing, then retest. Explore and Bar Heartbreak are equal primary listening destinations and use the same large destination-card treatment. Do not show saved-result success badges or a separate result-save control in this action stack.
- A guest may finish and see the result without a save prompt. Signed-in completions save silently to the account; the result screen does not show a save control or a saved-state badge.
- Earworm has no APC reward, stake, daily point claim, or dependency on the Battle point economy. The completion value is the personality result, sharing, and continued genre listening.
- On an ordinary first Explore entry, AIPOGER may invite the visitor to start Earworm before browsing. The invitation must be dismissible with `先逛逛`; a skip is remembered for 7 days and a completion suppresses the invitation for 30 days. Track/share/genre/challenge deep links must bypass the invitation.
- Completing Earworm stores only the compact taste result needed for recommendations: primary genre, nearby genres, keywords, and completion time. Per-song reactions must not be kept in the browser profile or shown later as personal labels/history. The result's primary action returns to Explore `為你挑的歌`, where one compact recommendation mix is shown. The mix should be approximately 70% primary/nearby genres and 30% discovery; it must not change public catalog ordering, Battle eligibility, or Showtime state.
- Earworm results live in their own server-written table. They do not write to `battle_votes`, `battle_guest_votes`, Battle archives, wins/losses, historical defense/recognition data, or public ranking.
- Signed-in answers upsert one latest service-only aggregate input per account and track in `earworm_track_reactions`; a retest replaces that account's earlier input for the same track. These rows exist only to deduplicate and calculate public affinity. They are not a user-facing preference history. Guest answers calculate the local personality result but never enter the public aggregate.
- Explore and Bar Heartbreak may show `好感度 N%` for the same `listen_bar_tracks.id`. The score is `(love×4 + replay×3 + okay×1) / (distinct valid accounts×4)`, rounded to an integer. A public percentage appears only after 20 distinct signed-in accounts; below that threshold works with aggregate samples say `好感度累積中`. No card may add `你的反應` or another per-listener answer label.
- Blind affinity is a discovery signal only. It is separate from Heart, Bar survival, Battle votes/results, defense progress, Choice, Showtime, and every public ranking/order.
- The API revalidates all 10 track IDs, public/playable state, reaction values, and non-negative observed listening seconds before saving. Client-computed personality output is never trusted as the authoritative stored result.
- The V2 personality and affinity migrations create only server-written result/reaction storage plus a server-only aggregate view and their indexes/RLS grants; they do not create a formal Earworm vote table or call any point-award RPC.

## AIPOGER Showtime

AIPOGER Showtime is the front-stage name for the old Honor Board surface at `/rank`.

Legacy code, database tables, API routes, or historical docs may still use `honor_board` / Honor Board as internal terminology. Public-facing navigation, page title, share copy, and creator-facing eligibility copy should use `AIPOGER Showtime` or `Showtime`.

### Certification Retirement

- Keep the Showtime name and `/rank` route. Choice and community contributor Top5 appear together on one editorial page. The song monthly chart is no longer mounted on the public Showtime page; its records, APIs and owner management remain intact. Choice stays non-ranked and separate from monthly song ranks.
- There is no active Showtime certification. Retire manual/airplay certification, six-defense certification, automatic Battle-win certification, age/Heart-based promotion, certification badges and certification progress. No invitation, certified work or prior upload is needed to curate Choice.
- Preserve every historical song and audio asset, stable IDs, existing favorites, comments, compatible share links, actual Battle wins/losses, recognition source/time and historical eligibility data. These historical fields are not current listing, editing, Choice or chart qualifications; the existing 8-loss historical exemption remains as specified in Explore rules.
- Public playable community songs, including founder-migrated and previously certified works, appear on both Explore and Bar. The old rule that they appear only in Showtime is retired. Do not recreate tracks, refresh their publication date, reset their Battle record, or force challenge opt-in.
- Previously certified tracks return with challenge state reset to showcase/closed. A creator must explicitly opt in again after the reset and prepare a defender Drop; old open flags do not constitute consent. Preserve actual ongoing Battle history and normal invitation acceptance checks.
- Hidden, removed, moderation-held, inactive, unplayable and otherwise restricted works remain restricted. Historical recognition is not permission to restore exposure. Preserve all historical audio without turning private full songs or Battle-only clips into newly public complete tracks.
- Historical migration fact only: the 2026-07-10 founder batch used `public_time <= now() - 30 days`. It was a one-time migration, not an active age threshold, recurring promise, or present-day certification/visibility restriction. Keep internal provenance without founder/certification reward copy in the public UI.
- Work metadata editing is merged into `Profile / 我的作品` under the ownership, audio/history protection and moderation rules above; no separate certified/locked-work editor. `support_url` remains an external HTTPS URL with an optional short `support_url_label`. URL or label changes re-enter review and appear publicly only when approved. Do not add platform payment handling, money amounts, wallets, refunds, revenue sharing or checkout.

### Monthly Charts — historical data and owner management

- Use Asia/Taipei calendar months: `[first day 00:00, next month's first day 00:00)`, not a rolling 30-day or Monday-week window. Offer an overall chart and current fixed-genre filters; use stable song IDs rather than titles or creator display names.
- The only score is distinct signed-in non-author accounts with an effective song Heart in that month. Each account contributes at most 1 per song per month, regardless of how many days it Hearts that song. Exclude the song's author by ownership identity, not display-name text.
- Existing public daily Heart/favorite behavior remains unchanged, including authors' ability to Heart their own songs; author Hearts simply contribute zero to the monthly chart. Cancellation/re-Heart recomputes current-month support from remaining effective records: an account counts while it has at least one effective Heart in that month, never more than once. Removing only a Profile favorite does not cancel or recount Hearts.
- At least 3 distinct non-author supporters are required for a formal numeric rank. Below 3, show an unranked building-support state rather than inventing a placement. This is a chart threshold, not a change to the separate 3-audience official Battle rule.
- Rank by monthly supporter count descending. Only the owner may order songs within an equal-support group through `/admin/charts`; never alter support counts or move a song across score groups. Until decided, show `名次待定` without a numeric rank. Genre charts inherit the same relative order; a genre with only one member of the global tie has no unresolved genre tie. Score or group-membership changes invalidate the old decision and create a new pending group.
- Owner decisions are append-only audit records containing month, score, member IDs, selected order, actor and time. Month-end still freezes source counts and candidate snapshots; unresolved groups remain pending. Each frozen group may receive one valid decision, then its order is locked. Historical removal never silently fills its reserved rank with another song.
- The admin overview and chart workbench show pending groups across months. Duplicate hints use identical stored file hashes or same-creator normalized titles only; these are review prompts, not audio fingerprints or proof of duplicate music. Owner listening and confirmation are required for the existing soft-withdraw action; never auto-delete or merge Hearts.
- Exclude cumulative/all-time Heart totals, favorites alone, Choice selections/collection Hearts/saves/comments, Battle wins or audience votes, Earworm affinity, play counts and invented composite scores. Explore Hot Now remains its separately defined discovery view, not a substitute monthly chart.
- Monthly eligibility covers all public, playable Bar songs with reliable song identity and effective Heart records; certification and publication age impose no extra condition. Explore-only 8-loss retirement does not unpublish a song from Bar or exclude it from monthly charts by itself. Actual hiding, removal, moderation, inactivity, unplayable audio and valid-genre restrictions remain enforced. A Battle-only archive is not automatically a full-song public catalog entry or chart candidate.
- The current month updates from effective records. At month close, freeze a monthly snapshot containing the actual period, scoring version, song IDs, supporter counts and ranks; retries must not create duplicate or changing settled results. Later Hearts belong to their own month and do not rewrite a frozen month.
- Start with the launch/current month only, using reliable effective records from that month. Do not reconstruct or fabricate pre-launch monthly standings from lifetime totals, certification dates or Battle history. Historical month selection exposes only real frozen snapshots accumulated from launch; absent snapshots provide no invented winners or movement arrows.
- Hiding or moderating a song after settlement still blocks public playback/exposure as required. Preserve its historical snapshot record and treatment state without rewriting original ranks or promoting another song to a fabricated historical win.
- Public responses expose aggregate support counts, not supporter identities or private favorites. Empty, below-threshold and unavailable-data states must remain honest; do not fill a Top 10 with mock records.
- Historical chart data and owner audit remain available through the original API/admin workbench. Older `/rank` month/genre/anchor links still reach Showtime, now showing curation; they do not recreate a public monthly song chart or rewrite historical results. Sharing never creates a vote or frozen snapshot.

### Community contributor Top5

- All three people lists use a rolling 30-day window, not calendar months. Order by valid contribution count descending, latest qualifying activity descending, then stable account ID; display consecutive positions 1–5. Accounts are grouped by ID, never by display-name text. Owner has no rank multiplier or eligibility exemption; real qualifying owner activity counts under the same rules.
- 熱心樂評: count distinct other creators' currently public/playable community work IDs reviewed with a visible comment containing at least20 non-whitespace characters. Repeat discussion is allowed and not rate-capped by this board, but one work counts once; music/MV share the work/comment records. Hidden, short, self and out-of-window comments do not count. Comment edits do not reset original creation time.
- 活躍創作者: count original currently public/playable community submissions created in the window. Drafts, hidden/removed/moderation-held/inactive works do not count. Adding an MV link, editing, re-sending or old-song restoration never creates another submission or resets its date. Link and audio submissions share the original work IDs.
- 熱心評測者: count completed valid blind questions with both sides at least8 actual seconds and the corresponding original3Credit receipt, including ties. Pending, skipped, incomplete, replay/retry and old questions do not count; the existing unique unordered-pair rule remains. Previously earned valid activity remains a count even if its old song later leaves the discovery window; no per-song choices/pairs or account IDs are exposed publicly.
- Public people rows expose only existing public display name and aggregate count, no email, private profile/ledger, pair mapping or votes. Name is plain text, not a link to another person's private creator center. The service-only SECURITY INVOKER RPC reads existing data; no client can execute it directly. The public API emits only bounded aggregates and public excerpts and fails visibly on errors.
- 本週值得讀的樂評 uses at most two latest qualifying non-self visible comments on distinct works from the current Asia/Taipei Monday week and current normal three-month discovery window. It is an excerpt selector, not an expert certification or new reward. No qualifying excerpt means a concise genuine empty state; original comments and works remain untouched. Choice cards show only actual visible public collection-comment counts, separate from song comments.
- This page does not award Credit, modify song popularity points, affect Battle results, restore songs or select the later proposed20 archive works. No old-song cleanup or storage deletion is enabled here.

### AIPOGER Choice Weekly

- Any signed-in account may create and manage its own Choice through `/profile/choice`, reached from the single `製作我的 Choice` action on Showtime or Profile favorites. No certification, invitation, creator level or uploaded work is required. Owners use this same personal workflow. The official creation editor and its mutation/upload API are retired; `/admin/choice` only lists all published official/creator Choices for viewing, featuring and confirmed deletion. Existing official published records, identity and share links remain intact; legacy unpublished official drafts are retained but hidden, not deleted or turned into owner tasks. Legacy `/admin/showtime` redirects to works management.
- The personal selection source is the user's private favorites across ALL currently public, playable songs, including older and formerly certified works; there is no 30-day cutoff or certification filter. The personal selection list orders by that user's latest successful save time, newest first; filtering preserves this order. Already arranged Choice items keep their explicit positions. Legacy saves without a per-user timestamp retain stable existing order behind dated saves; never fabricate dates from song upload time or another listener's activity. Both favorite and Bar Heart save paths record time only on a new save transition; removal drops that user's timestamp and a later re-save records a new time. Repeated daily Hearts on an existing favorite do not bump it. The private per-user time map is never exposed by public APIs; rollout does not backfill historical timestamps. A song may be in multiple curators' Choices without changing its source record.
- Keep song Heart/favorite, Choice-selection checkbox, and collection-level Choice save separate. Selecting or deselecting a song does not Heart/unheart or favorite/unfavorite it. Removing a favorite or cancelling a Heart must not remove an existing draft/published Choice selection; removing a Choice selection must not remove the favorite. Visibility and playback restrictions still apply independently.
- 2026-09-21 使用者確認：Choice 選曲先在畫面上勾選最多 10 首，再按「確定選曲」加入編輯；標題、推薦文章、選曲與播放順序只在按「儲存」或「發布／撤回」時提交，不逐首、不逐字自動存檔。歌曲可直接指定 1–10 的目標順位，其餘自動補位。未確認的選曲需先確定；未儲存的變更離開前提示。失敗保留畫面編輯，整批選曲與文字須以單一交易保存。新草稿第一次明確儲存才建立，既有當週草稿仍可續編，保留每位策展人每週一份與發布 5–10 首的規則。
- Each account may publish one Choice collection per Asia/Taipei Monday week, `[Monday 00:00, next Monday 00:00)`, with 5-10 distinct songs. Drafts may have fewer; publish revalidates count, ownership and current public/playable eligibility. Withdrawal and editing reuse that week's collection rather than enabling a second issue. This calendar week is distinct from the personal 168-hour upload allowance.
- Ageing never removes a selected song. Later hiding, removal, inactivity, missing audio, moderation hold or applicable retirement must stop public playback without erasing historical selection data or restoring the song. Only the curator may edit their own collection; owner moderation can remove a Choice and its collection interactions without altering any selected song.
- Choice uses real editorial covers in a lead/companion/more layout beside community contributor Top5. Creator Choices use the curator's current Profile identity cover/avatar and display name. Historical official collections retain their explicitly saved `官方 AIPOGER` or personal `愛波哥` identity; new owner Choices use the same Profile identity as every other curator. Never infer identity from the title. Keep issue title, curator and date separate.
- Only the owner may designate one published official or creator Choice as the Showtime feature through `/admin/choice`. Reuse its existing cover/title/curator; do not create another banner editor. Selection requires public playable content and never changes song data, ownership, scores or visibility. An unset, withdrawn, deleted or unavailable selection has no featured label; present available Choices normally, without fabricating an endorsement or reserving an empty promotional slot.
- Cards retain the authored recommendation excerpt, sequential play, one tracklist icon, share, comments and toggleable collection-level Heart/save. Desktop hover/focus may preview order; clicking opens the existing interactive HUD on desktop/mobile, with title/date, intro, song Heart/favorite actions, individual play, Play All and full share-page link. Song actions reuse existing records, never Choice-only song totals. Do not add marketing explanations, a separate article HUD or duplicate Featured/Top shelves.
- Keep `#choice-weekly` as the Choice anchor; the legacy `#monthly-charts` anchor now lands at the same public curation area without restoring the old chart. Homepage links and `/today` remain usable. Published playlists retain `/choice/{id}?kind=official|creator`, curator identity, date, introduction, share, comments, collection save, tracklist, individual play and Play All; do not redirect away from the usable playlist.
- Signed-in listeners retain saved Choice playlists in Profile through `/api/choice/saved`, with direct open/remove actions. Collection interactions do not change song Hearts, monthly scores, Battle records or Explore ordering. Choice is curation, never certification or an automated weekly winner.
- Choice selection never auto-creates social drafts or publishes externally. Keep the existing approval and explicit-send requirements in the social publishing rules.

### Playback And Presentation

- Desktop gives approximately 70% width to Choice and 30% to three compact people Top5, using the approved fusion mock. A compact heading and one Make My Choice CTA sit above the lead playlist; the right message is「每一份歌單，都是一個人的生活片段／在這裡，讓更多好音樂遇見更多人。」The lead has cover and description side by side, other playlists below, with inline play/save/comment/share and one tracklist control. Original covers, curator names, playlist content and stable IDs remain authoritative; no generated mock content is published.
- Choice supports Featured (owner-designated lead if valid, otherwise newest), Latest and Most saved browsing. These are playlist browsing orders, not song ranks or certification. The shared player keeps curator sequence, play/pause, seek, previous/next and volume.
- Mobile shows Choice first, then a single contributor region with review/creator/blind-listening buttons. Only the selected people board is visible, without adding three large empty panels. Counts are actual; fewer than five qualifying people means fewer rows. Errors are explicit, never fabricated zero votes or mock people.

- Historical authorized Battle audio remains accessible through compatible archive/share paths without requiring a fake monthly rank. `Full Song` is available only with the winning creator's explicit complete-song authorization; otherwise expose only the authorized archived Drop clip.
- Retain lyrics viewing with preserved line breaks and a readable HUD/modal; absent lyrics show `歌詞未提供` / `No Lyrics`. Display actual metadata and compact functional controls, not certification labels or marketing copy explaining the redesign.

Creator stages:

- Stage 1: `熱血音樂工匠` / Lv.1-Lv.3
- Stage 2: `潮流音樂大師` / Lv.4-Lv.7
- Stage 3: `殿堂級音樂師尊` / Lv.8-Lv.10

## Storage And Bandwidth

Storage and bandwidth usage, subscription limits and active-battle load must be measured for the current operation. Do not reuse May storage snapshots or assume a paid plan is active without checking. Preserve duplicate-file protection and review orphaned uploads only under a specific cleanup scope.

Mobile playback guidance:

- Bar Heartbreak exposes an in-page volume slider on mobile and desktop.
- Do not treat a changing percentage label as proof that mobile volume works. Some mobile browsers lock `HTMLMediaElement.volume`; after a user gesture, Bar Heartbreak must fall back to a Web Audio gain node while keeping normal native volume on browsers that support it.
- If the browser suspends the Web Audio context, the explicit resume-playback action must resume both the media element and the gain context. If neither native volume nor gain control is available, show a concise system-volume fallback instead of silently presenting a nonfunctional slider.

## Image Upload Moderation

Current behavior target:

- Adult non-explicit swimwear, stage looks, and tasteful sexy fashion images are allowed on avatars and cover art.
- Prohibited image content remains: explicit nudity, sex acts, porn/adult redirects, sexualized minors, graphic violence, self-harm, hate/discrimination, scams, gambling redirects, drugs/weapons, personal data exposure, impersonation, stolen brand assets, celebrity likeness misuse, and infringing content.
- User-facing upload rules should clearly distinguish `non-explicit sexy styling is allowed` from `pornographic or exploitative content is banned`.

## Deployment Safety

Before deploying changes that touch product rules:

- Confirm whether the change affects auth, upload, Battle queueing, Bar Heartbreak rotation, AIPOGER Showtime display, or storage.
- Update this document if a rule changes.
- Update `docs/aipoger-engineering.md` if a new verification step is needed.
- Update `docs/aipoger-experience.md` if visual language or page identity changes.

## Battle Records 月份與數字呈現

- 月份篩選同時適用 Drop 和 Q Crash 列表及全部聲稱本月的統計；不以不同的跨月最近 N 場混入本月。
- 單場票比顯示得票率（Vote share），不能標示跨場勝率。缺少雙方票數時不猜測百分比。
- 跨場 audienceCount 加總稱投票人次（Voter entries），不能當跨場不同觀眾人數。這不改任何正式票數、勝敗或歷史認證資料，也不計入 Showtime 月榜。
