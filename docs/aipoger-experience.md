# AIPOGER 版面與使用流程

文件整理：2026-10-25；產品實作基準：2026-10-25。主文件 3／6；產品門檻與權限以 [產品規則](aipoger-product-rules.md) 為準。Showtime前台為Choice與社群人物Top5；歌曲月榜的歷史管理保留。當前參與流程修復與正式驗收見下方 report，不以舊月榜版面當改版基準。

## 對戰連結與三種長度（2026-10-25）

- 新Drop入口沿黑橘舞台，先貼Suno／YouTube／本人Aipoger公開單曲連結，讀取來源、補歌名／公開創作者／曲風／歌詞，封面沿來源或另選圖片；不再選音檔、裁切及輸出檔案。
- YouTube雲端無時長時，顯示「啟用官方播放器，讀取歌曲長度」，點擊後才載入官方播放器並顯示讀取提示；讀到長度前停用投稿，試聽由使用者手動開始。讀取完成沿用同一播放器，不中斷正在播放的預覽。
- 發起者以同排三個按鈕選每首60秒、90秒、整首；片段另設起點和選用試聽，預設60秒。接戰讀取原卡並鎖定模式／曲風，舊卡沿用原45秒；每張新挑戰卡顯示長度標籤。原發布後10／15／20分鐘或固定自訂開始時間保留。
- Q Crash沿原藍青雙作品舞台與完整歌曲自由聽／投票；新投稿共用連結表單，保留獨立封面、歌詞、預設2小時及30分鐘／12小時／自訂最多3天、指定創作者邀請及本人兩版本。
- 原Drop雙唱盤／回饋與投票布局保留；YouTube來源以可見官方播放器接在各作品下。A／B互停，片段採相對時間並在尾端停止，整首各用實際長度；輸入文字不重建播放器。新成果卡與記錄也可原地重播，舊音檔繼續使用原播放器。
- `/drop-guide`改為三個模式卡片與同頁定位：盲聽、Drop、Q Crash各有步驟和入口，另說明連結與權利；四語SSR正文／canonical／hreflang／Sitemap，移除過時酒吧與Discord導流。原投票、正式3人門檻與盲聽匿名／選中揭曉保留。


## 修改依據與確認日期

2026-10-15（Asia/Taipei）使用者確認並授權完成本輪修復。本文件為現行基準；驗收範圍、發布版本及限制見[創作聖經改版report](releases/2026-10-15-bible-redesign.md)、[YouTube電台／投稿report](releases/2026-10-15-radio-link-submission.md)及[參與流程report](releases/2026-10-15-participation-flow-fixes.md)。未有使用者新的明確指令，不得擅自改動點數數值、追回／恢復、投稿額度、排行公式、Owner權限、舊歌排除名單或公開文案邊界。修訂須記錄確認日期、具體差異與驗證證據，先更新對應現行正文，再同步索引與既有Drive檔案。舊技能摘要、歷史發布紀錄、GitHub main或另一代理的提案不能覆蓋現行規則；使用者後續明確指令仍優先。report提供證據，不另建立第二套產品規則。

This document protects AIPOGER's visual identity. Use it before redesigning any page, adding major UI, or changing user-facing copy.

導覽：品牌與首頁 → Drop／Q Crash → 酒吧 → Showtime／Choice → 帳號／後台／聖經 → Battle 細節 → 本次資訊層級。

## 搜尋入口、作品分享與教學轉換（2026-10-25）

- 首頁、探索、MV、Showtime／Choice與Battle公開清單以伺服器端資料作為首次畫面，再沿原前端互動更新；不把載入佔位當作公開頁正文。作品標題可連至 `/works/[id]?lang=…`，原播放與評論按鈕維持原操作。
- 獨立作品頁顯示原歌名、舞台署名、介紹、媒體及同一作品的評論評分；依2026-10-25後續確認，桌機／手機均上播下評，880px緊湊單欄。評論輸入／送出不重建播放器。分享鍵導向同一原 ID，舊歌曲／MV連結仍可用。
- 未選曲或歌曲沒有非空歌詞時，收合歌詞操作與內容，不顯示「Lyrics not provided」，不把未填歌詞推定為器樂。
- 創作聖經公開五篇入門導讀，內容只取既有公開FAQ；每篇文末及公開聖經底部有黑橘 CTA：主按鈕到創作者中心投稿，次按鈕到Battle，支援中英日韓。登入後的完整內容、搜尋／複製／試聽與會員界線保留。
- 每首作品、歌單及公開導讀的標題、摘要、canonical／hreflang與OG／Twitter在初始HTML提供。作品／歌單封面以1200×630畫布等比完整呈現；Q Crash依既有中英支援，日韓回退英文，不標示不存在的翻譯版本。

## 作者回覆與播放器還原（2026-10-25）

- MV及外站播放視窗恢復880px內的上下單欄；不再有影片左下方與長評論並排的大面積空白。視窗內捲動、輸入與送出均保留同一播放器；手機鍵盤只調整可視高度。作品獨立頁沿相同單欄，SEO與分享預覽保留。
- 原評論下方直接顯示「回覆評論」；僅原作品所屬帳號能操作，輸入框按需展開。回覆縮排接在同一則原評論下面，標示「創作者回覆」與公開舞台名；成功時以伺服器結果顯示已送出或+2 Credit。後續可繼續回覆，沒有每日或總額限制；同則原評論只獎勵首次。
- 回覆失敗保留草稿並使用同一請求ID重試；不因新增回覆刷新或重建影片。原評論者收到既有私人互動通知，點開可定位到原作品的評論串。中英日韓同步，Credit明細顯示回覆收入。
- 歌曲有詞時可在播放器／作品卡及評論視窗開啟歌詞；MV畫面不另加歌詞區。空值與純音樂不放缺詞佔位。

## 精選首頁社群入口（2026-10-24）

- 首頁最下方以「加入創作討論社群」搭配 Facebook、LINE 品牌圖示與名稱，直接開啟既有 Aipoger 社團與 LINE 社群邀請；沿用 `src/lib/brand.ts` 的正式網址，新分頁開啟，不載入第三方社群嵌入程式。
- 使用者確認 Discord 暫不放在本次首頁入口，待檢查邀請狀況；不新增失效或未開放的按鈕。其他頁既有社群入口不變。
- 依使用者後續確認，Facebook與LINE圖示緊接標題，不另外顯示平台文字；保留可存取名稱與44px點按範圍。介紹文案接在標題下，原投稿／關於／合作連結往上合併於同一個精簡頁尾；桌機同排，手機緊接下一行，不另加分隔線或大段留白。四語文案保留，手機探索音樂操作列允許自然換行，避免較長外語連結橫向溢出。

## 關於愛播歌與廣告合作（2026-10-24）

- `/about` 與 `/partners` 採已確認的黑橘編輯式版面，沿用首頁頂欄、投稿、登入與語言操作；兩頁不再疊加舊固定首頁／語言／登入或現場人數徽章，已登入帳號入口保留。
- 關於頁以自然光黑膠唱盤主圖、右側「讓好聲音被聽見」、探索音樂／Showtime社群入口、三個平台介紹欄與三個原生可展開說明呈現。原授權、下架處理、權利通知、重要聲明與聯絡文字完整保留；日韓的法務正文仍沿既有英文回退。
- 合作頁採女生戴耳機坐在唱片間閉眼聆聽的俯拍主圖。工具與教學、音樂與MV企劃、主題活動三列可展開，提供帶項目主旨的洽談郵件；下方混音台聯絡橫幅與頁尾使用 `aipoger99@gmail.com`。頁尾互連，內部連結保留語言。
- 三張主圖為依確認稿生成的攝影風格素材；使用壓縮WebP與響應式圖片，首屏主圖優先、下方聯絡圖延遲載入。手機改為圖片在前、文字在後；四語桌機與320px／390px驗收，英文／日韓標題依字長調整欄寬與字級。
- Drop Battle 規則頁、排行、互動、Credit與資料庫未改。發布與測試證據見[兩頁新版驗收](releases/2026-10-24-brand-pages.md)。

## 專輯區與按需載入（2026-10-24）

- Explore 原操作列第三個入口是「專輯」。沿用搜尋／曲風與「這裡怎麼玩？」；專輯模式顯示作品封面、專輯標記、名稱、創作者、播放／留言／分享，暫不顯示單曲電台或Top50。
- 專輯分享連結保留語言、專輯ID與view，預覽優先使用MV實際封面，沒有MV則使用專輯封面。打開連結或封面不自動播放；明確按播放才建立播放器。曲目清單依創作者排序，音檔及YouTube MV可接播，其他外站來源保留可見外站播放器與手動下一首。
- 投稿區先選作品類型，再選連結、音檔或「建立我的專輯」。從專輯區CTA進入時預選專輯；選曲支持加入、移除、前後移，未確認發布不寫入作品。選用封面限JPEG／PNG／WebP／GIF、10MB內，未選則沿用第一首封面。
- 專輯評論沿原作品的統一視窗及登入流程，顯示既有留言與按心入口，不顯示數字評分輸入或單曲平均分。原單曲及MV的評分介面保持原規則。
- 評論視窗、投稿音檔、外站播放器、通知與頭像裁切工具分拆下載；非首屏投稿工具在接近畫面時載入，沒有額外的「載入工具」操作步驟。裁切僅在開啟時掛載；下方曲風區延後繪製，首屏標題、品牌及主要封面正常顯示。
- 非優先MV卡片使用同影片標準尺寸縮圖，錯圖退回同影片高畫質圖；主視覺仍優先最高尺寸，社群分享仍由伺服器確認可用封面。
- 320px四語及390px手機、桌機已驗收；具體發布、效能量測與限制見[本次驗收](releases/2026-10-24-albums-loading.md)。

## Core Feeling

AIPOGER should feel like:

- AI music.
- DJ culture.
- Night-stage energy.
- Creator battle.
- Public radio.
- A slightly emotional, stylish, music-community room.

It should not feel like:

- A generic SaaS dashboard.
- A plain upload utility.
- A stock music marketplace.
- A cold ranking site.
- A beige creator portfolio.

## Visual Language

2026-10-15使用者確認的全站設計原則：精簡、俐落、有設計感，相關資訊整合在原位置，讓人一眼理解。能與既有標題／副標／操作同排就不另開一排；先摘要、點開才看詳情，避免額外說明格、反覆卡片與不必要留白，手機可操作尺寸仍須保留。

Base:

- Black or near-black background.
- Orange light as the main brand energy.
- Cyan as a small electric accent.
- Gold/yellow only for highlighted music records and compact accents, not retired certification or qualification badges.
- Use glow, border, and glass-like depth sparingly; keep the interface readable.

Avoid:

- Random bright palettes.
- One-note purple/blue gradient branding.
- Generic cards everywhere.
- Big marketing sections where the app itself should be visible.
- Decorative shapes that do not support music, stage, or battle identity.

## Typography And Copy Tone

Chinese copy should feel direct, musical, and a little stage-like.

Use:

- `公播`
- `挑戰池`
- `正在拼人氣`
- `AIPOGER Showtime`
- `勝利榜`
- `熱播`
- `封存紀錄`
- `聽眾反應`

Avoid:

- Over-explaining rules inside the app.
- Calling Bar Heartbreak a ranking chart.
- Calling Challenger a waiting room in the main UI.
- Too much admin/product-manager language.
- Empty marketing slogans.

## MV 放映室

2026-10-25依使用者選定第一張設計稿改版 `/mv`：沿用黑橘音樂舞台與共用頂欄，桌機左側MV人氣榜、右側四支最新上架（2×2、16:9真實封面），完整MV清單接在下方。移除原單支精選大主視覺；首頁保留原設計，選曲依下方首頁新作輪替規則。

- 標題「值得一看的MV」與搜尋／曲風／連播／這裡怎麼玩整合在緊湊入口。榜單顯示名次、真實封面、歌名、作者、平均評分／10、評分人數、收藏人數及Heart；榜單最多50名，固定高度內捲動。手機預設收合、可原頁展開，不另開浮層；新作仍能在首屏看到。實際資料不足不填假作品。
- 最新上架依原投稿時間排列四支，NEW沿原7天標記。最新區不受下方人氣排序影響；新作是否有評分不影響最新曝光。右側卡片和下方完整清單共用真實縮圖與高解析回退，沒有使用設計稿的示意作品／分數。
- 「全部MV」預設最新上架，可切人氣排序、載入更多及查看全部；每次12件、全量搜尋／曲風生效，保留原精選及公開歷史作品。評分／支持刷新維持卡片，重設回最新。人氣服務失敗顯示重試並回最新、收藏失敗不補0。排行榜使用Explore相同公開資格／公式，沒有另一套評價系統。
- 歌名旁整合愛心、評論、分享；作者和平均評分／人數、收藏人數緊接下方。桌機長歌名省略、手機最多兩行，原作品頁保留完整標題；操作目標至少44px。愛心切換原作品Heart／收藏，評論沿原ID，非另建留言；訪客登入返回原MV。沒有本週票數冒充收藏人數。
- 卡片封面及橘色觀看按鍵直接開同一觀看／評價 dialog 並開始播放；歌名與評論圖示／分享接收連結開同一視窗但由訪客按播放。觀看、支持、評分、留言不再轉第二個視窗；原作品ID及評論資料保留，關閉回原卡片並恢復焦點。登入保留原MV的track深連結。
- 影片下方保留愛心／分享與來源；評價區依序為「這支 MV，你給幾分？」、手填數字輸入框／10（1–10、最多一位小數，例如8.7）、緊接「留下你的感受」文字框及「送出評價」。不預填分數，輸入框有橘色邊線與焦點、decimal手機鍵盤，超範圍／多位小數提示且停用提交，自己的輸入先於公開評論；客人可讀分數／評論，作者可留言但自己的數字停用。手機長標題用較小完整換行文字；卡片仍最多兩行，不使用跑馬燈。
- 榜單／卡片資訊列顯示「8.4 / 10 · 23人評分」及收藏人數（格式示意），沒有評分顯示「尚未評分」，不在圖片上疊另一塊評分卡。
- 標題操作列保留橘色「連播 MV」，按當前篩選與排序建立完整播放清單。觀看視窗同列顯示連播中、目前位置、上一支／下一支與停止連播；播放器提供播放／暫停，瀏覽器阻擋自動接播時提供點擊繼續。清單結束不循環重播，評價送出中防止切錯作品；往回切換保留本次未送出的各作品草稿。原橘色捲軸及「往下看評論」定位保留。

- 頻道網址保留於下方獨立區塊，明示不是影片網址。投稿提示連既有音樂投稿及 Profile 原作品管理，補 MV 連結不再填第二份資料。
- 中英日韓文案與頁面 metadata，搜尋／篩選／載入更多、空結果重設及失敗重試均可操作。四語手機／桌機無水平溢出；手機導覽可左右捲動。點 MV 播放先暫停共用音訊；連播與留言共用唯一影片播放器。

## 探索音樂

`/ai-music` 沿用選定黑橘參考圖，共用頂欄。第一層是「傷心酒吧」小電台，接著左側「探索音樂」大標、右側搜尋與測驗，再接分類控制與緊湊雙區布局；撤下原酒吧舞台、聊天、歌詞牆及投稿區。

「探索音樂」標題旁提供44px分享鍵，分享固定正式探索網址並保留當前語言，不帶搜尋、曲風、作品、登入或私人參數。支援原生分享的瀏覽器使用系統選單，否則複製介紹與網址，成功顯示四語提示；取消不報錯，不支援／失敗可重試。此按鈕與封面的單曲分享各有用途，不發點、寫票或自動傳訊。

- Radio 有全部／Jazz-Bossa／R&B／City-Pop 捷徑與完整14曲風選單；封面、歌名、創作者、上一首／播放／下一首、進度、音量、橘心及白評論同行。手機分配緊湊控制，不新增裝飾空行；音檔採唯一共用音訊，電台可見時收起音檔底部控制；YouTube則保留可見官方小播放器。
- 2026-10-25播放與評論同窗：探索外部作品的播放／評論都開同一原作品視窗，依同日後續確認還原為桌機與手機均上方播放器／下方評分與留言的880px內單欄；MV觀看視窗共用新版。播放器不隨打字、送出、支持或曲庫刷新重建，手機鍵盤只改視窗尺寸；關閉／切換作品才清理。仍用原評論／評分API及原作品ID，無資料搬移。
- 桌機左側直接顯示人氣Top50，約占原六欄的兩欄，右側四封面一列；窄屏三欄、手機兩欄。手機榜單先顯示三首、平板四首，按「展開Top50」在原頁展開50名，按同處可收起；撤下舊排行榜dialog。榜單不放評論標誌：點封面播放、Heart支持、歌名清除不相符篩選並展開、定位與短暫標亮原卡。名次連續，同分新歌先；新歌7天內綜合分加3，保留真實支持者／盲聽人數及原投稿日。
- 有耳朵主場才顯示單列四首「為你推薦」，約三主場／近鄰＋一探索；下方曲風列排除其ID。未測驗先展示實際曲風牆。每類收合四首，既有七日NEW／每創作者首屏最多一首NEW規則保留，完整展開可看其餘同曲風作品。
- 搜尋涵蓋全部符合當前Explore公開資格的原作品，作品／創作者／工具与曲風交集；無結果可重設、錯誤不偽裝空曲庫。資料每分鐘及回到頁面時刷新，保留訪客篩選、展開及定位。
- 2026-10-14舊歌回歸沿用原曲風、封面、歌詞、播放／評論與作品ID，舊歌不標NEW，也不另加活動或加分標籤；Top50沿用同一公開曲庫；目前依2026-10-24定案顯示「依人氣排序 · 評分與收藏分開顯示」。台灣時間11月1日00:00例外結束，電台與頁面使用既有刷新退出期滿作品；Profile公開狀態及探索導向配合同一資格。Showtime、首頁單曲與盲聽頁未改，公開網站完整保留規則文案另待使用者下一步。
- 封面下是歌名旁大橘心與白評論，下行創作者，接戰作品保留攻擂；歌詞／分享在原封面位置，不增加互動橫列。歌詞以文件圖示取代資訊圖示，點擊展開黑橘非阻擋面板，橘色捲軸、44px關閉鍵、曲名／創作者及原歌詞換行可讀；缺詞顯示「歌詞未提供」。點外／同鍵／Esc及開其他歌詞會收起，內部閱讀捲動／選字保留；頁面scroll／resize收起，四語與手機範圍不溢出。按評論開原作品modal，公開可讀，登入才留言／按心。榜單依原人氣公式排序，移除31.0分等混合積分；在歌名／創作者下方分開顯示平均評分／10、評分人數與實際去重收藏人數，未評分顯示「尚未評分」，收藏讀取失敗標暫不可用。Top50仍不加評論圖示。原作品評論視窗和MV共用小數輸入框／10與感受文字框，要求一般評價填分數、作者只留言。歌曲卡在創作者下方使用同一緊湊文字資訊列顯示平均／10、評分人數與收藏人數，沒有新增操作排；手機長標題縮小完整換行，歌曲／MV視窗都提供橘色捲軸。
- 所有投稿入口進 `/profile?submit=1&lang=...#submit-work`，登入後打開自己的「我的作品」上傳表；既有檔案、metadata、手選曲風、額度与審核流程沿用。到期作品在新版創作者中心標記推廣期結束並保留管理／預覽；歷史最高名次仍是後續設計。
- GUIDE保留X、Escape、backdrop、focus trap／return，四語完整；舊 `/listen-bar` 和 `/l/...` 保留曲風／語言導到小電台，舊投稿hash導到Profile。原戰績與攻擂明確同意機制保留。

## Homepage

2026-10-25首頁新作曝光修復：沿用黑橘編輯式首頁，主視覺「現在值得一看」輪替近期MV，最多三支新作及一支本週社群支持作品；新上架MV首四小時先顯示，最新MV保留在本組，其後每四小時按創作者輪替。下方「探索音樂」排除上方全部作品後，展示一首最新與兩首近30天輪替單曲，連結／MP3均可入選；候選不足少顯示，不重複填滿。首頁不展示專輯區塊。桌機為左側寬幅封面、右側作品資訊；手機依序放封面、資訊與單曲列。

- 導覽：精選、探索音樂、MV、Showtime、Battle、創作聖經。探索連到 `/ai-music`，Showtime 保持 `/rank`，Battle 保持 `/battle`，創作聖經沿用 `/ai-music-bible`；MV 直接連到 `/mv` 放映室。
- 主視覺使用真實創作者作品、YouTube 封面與既有 optional MV URL。支援高解析封面逐級回退。按「觀看 MV」才嵌入官方播放器；切換至 MV 先暫停共用音訊，改播單曲則移除 MV 播放器，不讓兩種音源重疊。
- 新作標「新作放映」、本週支持席次標「本週社群精選」、無近期新作的歷史回退標「發現好作品」。不同非作者的週支持有資料才顯示真實人數，不把輪替多首標成同票；上／下一支沿原操作，沒有自動強制換播。每分鐘／回到頁面刷新，時段變更只重設待看選曲；正在看的MV及開啟中的評論維持原作品，不中斷播放或草稿。沒有作品／讀取失敗各有真實狀態。
- 推薦理由優先展示公開且 moderation-visible 的非作者留言，保留留言者署名；沒有可展示留言時標「作品介紹」，使用創作者原文。不將社群入選冒署為「愛波哥推薦」。
- 「評論與支持」開啟首頁原作品視窗，公開評論可讀；登入會員透過既有留言與 Heart API 參與，沿用相同作品 ID、收藏與審核。留言失敗保留文字，客人先登入；不因觀看或純留言則數發點；有效評分評論／Heart沿正式Credit規則。Explore卡片可開同作品評論視窗。
- 三首單曲：MP3使用既有底部共用播放器；只有作品連結則開既有官方來源播放器與評論評分同窗，先暫停其他音源，刷新不重建該視窗。歌曲標題連到原作品獨立頁；保留「進傷心酒吧」的持續聆聽入口。「投稿作品」進入 `/profile?submit=1&lang=...#submit-work`，手機頁尾也能投稿；不新增 MV 重複投稿表。
- 頂欄沿用官方 Logo、四語切換與登入入口；登入後保留原有帳號頭像／通知與 owner 後台入口。首頁、MV 放映室與探索音樂隱藏中央固定 presence badge 及重複的固定 Logo／語系／訪客登入控制；登入後帳號與通知保留。
- 中英日韓文案與類型名稱一起本地化，創作者的作品名稱與介紹保留原文。Explore 卡片原有首次上架 7 × 24 小時 `NEW` 與 `接戰` 角標規則保留，不能互相蓋住或遮住播放操作。

## Drop Battle

Role:

- Fast, competitive, hook/drop-focused.
- The energy is challenge, speed, and punch.

UI direction:

- Use competitive language.
- Make waiting/challenge states clear.
- Keep actions obvious: start, accept, cancel, enter room.
- Do not blur Drop Battle with 24H Full Song; they are different products.

### Q Crash

- Drop／Q Crash投稿沿用原表單構圖，來源切換「貼作品連結／MP3」，MP3上傳與驗證中顯示狀態，成功後用同一試播元件；填歌名、作者、歌詞不重建播放器。Drop維持60／90秒／整首及接戰鎖定；Q Crash播放完整歌曲。手機表單頂部避開全站Logo，不新增大型裝飾或空白。

- `Q Crash` is the asynchronous Full Song Battle mode, not a survey or ordinary social poll. Its source and timing rules are defined in `aipoger-product-rules.md`.
- Keep the same black stage, orange battle energy, small cyan electrical accent, A/B confrontation, and music-first language.
- Desktop uses two side-by-side work seats with a compact VS signal. Mobile stacks the seats and keeps both play/vote actions easy to reach without horizontal overflow.
- Each work seat shows the work-specific cover, work/version label, song, creator, genre, AI tool, full-track duration when available, one play action, and one vote action. Q Crash creation accepts supported public work links or verified MP3 (up to320 kbps,30MB); a creator profile cover is only a fallback.
- Keep the `Q CRASH` title compact so the work comparison starts high in the viewport. Lyrics open as an in-page HUD below the work pair; missing lyrics say `歌詞未提供` rather than leaving a blank panel.
- Playback uses one fixed bottom A/B player with explicit A/B switches, play/pause, seek, previous/next, volume on desktop, and close. Do not embed a native audio control in each work card.
- Voting state shows only the mode, deadline, work information, and the listener's private submitted state. A shared bottom rating dock switches between A and B and contains exactly five keys: 押韻、爆點、旋律、情緒、結構. Never show a count, percentage, total audience, feedback total, leader, radar, or visual progress toward a winner before settlement.
- Winner voting uses a two-step action: selecting A or B only marks a private, reversible pending choice; a separate `確定送出` / `Confirm Vote` control creates the immutable vote. Before confirmation the listener can replay, seek, and switch sides; after confirmation the choice is locked.
- Keep confirmation in a fixed high-contrast dock above the A/B player. The dock states the selected work, explains that selection is not yet a vote, changes to `登入並投作品 A/B` for signed-out listeners, and remains readable at 390x844 and 1440x900 without covering playback.
- Official results use a compact result panel and show the winning work's pentagon feedback distribution. An insufficient Q Crash shows no radar.
- Q Crash share invitations should feel like a friend asking for a quick listen and decision, not a system announcement: `這兩首歌到底哪首比較好聽啊？我有點選不出來！進來聽完整歌曲，幫我決定哪首勝出！`
- Q Crash uses Traditional Chinese only when `lang=zh`; English is the fallback for `en`, `ja`, and `ko`, including the card, creation flow, controls, share copy, and social metadata.
- Final copy leads with the winning work and then its creator. Never say that a creator defeated themself when both works have one owner.
- Battle首頁改為盲聽、Q Crash、Drop Battle三區；Q Crash建立與原場次位於第二區。每個active Q Crash仍是一張A/B卡，不拆成兩張普通queue。手機保留三區順序，允許向下捲到正式挑戰池。
- 新入口使用薄荷Q Crash及暖橘Drop，原Q場次青色／Drop正式池紅橘辨識保留。字／圖示為真實可操作UI，插畫不取代按鈕。

## 24H Full Song Battle（保留系統，非前台主推）

Role:

- Full-track one-on-one battle.
- Slower, more complete, more listening-focused than Drop Battle.

UI direction:

- Use `24H Full Song` or `24H Daily Battle` consistently where appropriate.
- Historical rooms and results remain accessible. New 24H upload entry is retired; its old setup link returns to Battle without changing existing rooms.
- Keep global active limits visible when they are implemented.
- Keep actual finished winner records and authorized historical audio in the Battle archive flow; do not present them as Showtime certification or monthly chart placements.

## Bar Heartbreak

「傷心酒吧」是探索音樂上方的持續電台，詳見上一節；不再提供獨立大型酒吧布局或聊天。選擇曲風才建立音檔／YouTube混合隨機循環佇列，進頁不自動播放；歌曲、音量、進度與卡片／固定底部播放器同步。

- 歌曲與評論沿用原ID；公開聽歌不用登入，Heart／留言需登入。NEW保留七日語意；正式Battle及Showtime月榜另依原規則。
- 投稿搬到Profile自己的作品區；手動曲風与可選音訊建議面板、上傳前21秒片段告知、建議逐一採用／自行選擇、worker未啟用時手選回退均保留。讀metadata不默改曲風。
- 不呈現Challenger席位、保護時間、生存日數、容量淘汰、房間故事留言、舊移動跑馬燈或大型金色招牌。舊聊天24小時API是歷史相容，不是前台入口。
- 一般會員連結／音檔共用個人168小時的前三首免費額度，額外成功投稿每首60 Credit，Owner顯示「投稿不限數量」且無數量限制，每曲風五首active上限取消，公開展示三個日曆月不等於刪檔或退額度。既有作品容量不自動回收；只清理沒有作品／對戰引用的新MP3私人草稿。

## AIPOGER Showtime

Role:

- Front-stage name is `AIPOGER Showtime`; old `Honor Board` wording is legacy/internal context, not the main public name.
- `/rank` presents Choice and three community contributor Top5 using the selected 2026-10-14 fusion design. The public song chart is removed; historical chart API/Owner workbench remain. `#choice-weekly` is the normal anchor and the old `#monthly-charts` lands at curation.
- Desktop uses a black `#070809` background, white sans-serif typography, orange actions and roughly70/30 content split. A compact SHOWTIME heading and one Make My Choice action sit left; the chosen two-line playlist message sits above the right Top5 rail. No certification catalog, certification badges, six-defense progress, invitation gate or fake content. No Drop victory / Bar heat / certification source tabs.
- Lead Choice cover and authored introduction are side by side. Other Choices form a compact cover row, later Choices use narrow horizontal rows; actual fewer playlists reflow naturally. Preserve actual covers and creator data; do not import generated sample imagery or counts. Featured/Latest/Most saved sort controls remain on the Choice heading row.
- Save, comment count and share stay on a single action line with a larger visible heart. One tracklist icon retains the interactive HUD and desktop hover/focus preview. Original sequence and root player are reused. Mobile first shows Choice, then one people board with Review/Creator/Blind buttons; no horizontal overflow at320px.
- The people rail shows rank/name/count in one row and 近30天. Fewer than five eligible people is an honest shorter list. Names are plain text, no private Profile link. Weekly real comment excerpts belong below Choice; an empty week has a compact invitation to comment, never sample quotations.
- The shared editorial header marks Showtime active and retains home, submission, language and account controls. Remove duplicate floating home/language/presence and guest-login controls only on `/rank`; signed-in Profile/Owner behavior remains.
- `/admin/charts` continues to show historical/pending months, support groups, audit and confirmed soft-withdraw. Monthly source counts/settlement rules are unchanged. Public people recognition does not replace their song scores.

Choice shelf and selection:

- Use the approved fusion artwork hierarchy: larger lead with adjacent metadata, compact companions and later wide rows. The owner selects the feature from published Choices in the existing admin library. Without a valid designation the heading is simply Choice Playlists, not Featured. Preserve original cover proportions and do not invent separate campaign artwork. Keep authored title, curator/date, recommendation excerpt on the lead, full intro in HUD/share page, sequential play, tracklist, collection Heart/save, share and comments. Do not add `CURATOR SETS`, a standalone article HUD or explanatory marketing copy.
- `製作我的 Choice` enters `/profile/choice` private favorites selection. Any signed-in account can use it; request sign-in only at the protected action boundary and return to the intended flow. Do not display certified-work, prior-upload or invitation requirements.
- Show all of the user's public playable favorites, regardless of song age or historical certification. Most recently saved songs come first in the top row; legacy saves without reliable per-user time stay in stable order behind dated saves. Search/genre filters keep this ordering; the selected playlist keeps manual order. Use compact cover rows with distinct selection checkboxes, play and existing song Heart/favorite controls; keep a separate selected list with ordering, title, introduction, preview, publish and withdrawal. An empty favorites state offers a direct Explore action without marketing text.
- 2026-09-21 編輯流程：收藏歌曲可連續勾選最多 10 首，跨搜尋／類型保留勾選，按「確定選曲」更新右側待儲存歌單。每首透過數字選單直接指定順位，其餘歌曲自動補位；文字輸入、選曲、排序、移除封面均先留在畫面，按「儲存」才送出。顯示尚未儲存，切換期數或離開頁面提醒。保存失敗不清除輸入；發布／撤回也保存目前已確認的整份編輯。新期數不需先建立伺服器草稿，回到工作台續編既有已存草稿。
- Selection checkboxes must never look like or act as Hearts. Unselecting a song does not remove its favorite; removing a favorite or cancelling its Heart does not remove it from an existing Choice. Unavailable or moderated selections retain an honest disabled state and cannot silently play.
- Choice 完整頁的曲目列表下方直接顯示評論區，頂部評論入口跳到 `#choice-comments`。顯示留言者頭像、名稱、時間與回覆入口；未登入者可閱讀並在留言時登入，返回原歌單評論位置。Showtime 卡片仍保留快速評論視窗，與頁面共用留言資料；中英日韓介面，送出失敗保留文字。
- Preserve the existing interactive tracklist HUD and usable `/choice/{id}` share page. Both show stored intro, ordered songs, song actions, Play All and the shared player; public Choice remains non-ranked.
- Choice 分享鍵與完整頁共用附封面版本的連結；LINE 預覽用同一張歌單封面轉成 1200×630 JPEG，完整構圖等比縮放、不另製海報。LINE crawler 在 head 取得完整預覽資料；一般瀏覽器維持 metadata streaming。舊聊天卡片不保證自動刷新，重新從分享鍵取得新版連結。
- `/admin/choice` is a compact published-only management list with search, pagination, real covers, curator/date/song count, public-view link, owner-only feature toggle and confirmed deletion. No official editor, draft creation, cover upload or selection pool. The owner uses `/profile/choice` to create, like everyone else; `/admin/showtime` redirects to works management. No manual-certification review queue, certification-only catalog or award actions. Do not add social-publishing controls to the personal workbench.

Own works and playback:

- Merge all creator-owned community song metadata editing into `Profile / 我的作品`, including formerly certified songs. Keep one compact paginated list and editor for cover, permitted display metadata, lyrics, YouTube and reviewed external support links; do not split normal works from locked Showtime works or place that editor above Choice selection.
- Audio, ownership, actual Battle wins/losses, votes, Hearts and historical provenance remain protected, not editable form fields. Challenge status is a separate explicit creator action in own works, never a side effect of saving metadata or appearing in a chart/Choice. Previously certified tracks require fresh opt-in after reset; keep the normal pending-invitation Drop lock.
- Public playable historical community works appear normally on Explore and Bar without certification badges or founder-only Showtime placement. Actual Battle history remains accessible in the information HUD; remove all six-defense promotion copy.
- Use one shared bottom player across charts, Choice, Explore, Bar and Profile, including play/pause, seek, previous/next, volume and lyrics. No native audio controls or waveforms per row. Preserve authorized historical audio/share access without displaying it as a fabricated monthly rank.
- Preserve the existing black/orange music-stage identity. Keep controls compact, accessible and readable on desktop/mobile; use state labels and action names, not in-app redesign explanations or marketing copy.

## 創作者作品表現

- 個人頁提供「作品表現」入口，前往 `/profile/insights?lang=<lang>`；中英日韓介面，顯示「只有你看得到」及返回我的作品。
- 最近 28 天、作品搜尋、每首歌曲的聆聽與轉換數據集中在私人頁；目前支持者／收藏者另標為目前狀態。正式對戰得票率獨立列出，不混成歌曲總評分。
- 桌機四欄、手機兩欄數據，保留黑橘視覺與全站首頁 Logo。詳細定義預設收合；比例同時顯示分子／分母，資料不足與錯誤均有真實狀態。
- 登出或換帳號立即清除舊資料，未登入保留返回路徑前往登入。公開歌曲頁不加整排分析數據。

## Account And Login

Owner task badge (2026-09-18): show the red pending-task count at the avatar's upper-right, separately linked to the admin task list; retain Profile at the avatar center and account/Battle notices at the bell. When both notice types exist, move the existing account-count marker to the upper-left so counts do not overlap. Red badge labels support zh/en/ja/ko. Admin overview lists actionable categories and counts with direct module links; opening it never dismisses unresolved work. New-song promotion and all Choice drafts are excluded. The existing Bar promotion count remains inside Bar admin for manual checking.

Role:

- Keep auth useful but not dominant.

Rules:

- Listening surfaces should not feel blocked by login.
- Keep authentication out of large marketing headlines and explanatory hero paragraphs. Use the normal product promise first, then a compact modal or sheet at the protected action boundary, with one primary sign-in action, a dismiss action, and the intended return path.
- Protected actions ask users to sign in at the action boundary. Anonymous Drop arena exceptions and Q Crash requirements follow the product rules.
- Error copy should explain what is blocked and what remains open.
- Profile saved music follows the same compact fixed-bottom player language as Explore, Showtime, and Choice. Keep one play action in each song row; do not place waveforms, native audio controls, or competing mini players inside the account list.

## 創作者中心：個人資料、作品與投稿

`/profile` 沿用選定的黑橘桌機稿：簡短標題與身分列、三項私人統計、同位置 Credit、左側作品／收藏／收到的評論、右側投稿。一般會員只看自己的資料；owner 多一個後台入口，原大型身分區移到「編輯資料」。

- 2026-10-15公開署名：編輯資料的舞台名稱說明在原位置註明也用於「留言、評價」。歌曲／MV、Choice與聖經留言使用已儲存的公開名稱；不增加真實姓名欄或額外身分卡。新留言不讀登入姓名或Email當署名，讀取失敗保留草稿並可重試。
- 作品表每頁 4 件，提供封面播放、狀態、有效支持人數、評論與編輯；搜尋及狀態篩選保留。桌機數據有獨立欄，手機把支持／評論數收進歌名下既有資訊行，維持 44px 圖示操作，不增設整排工具區。完整歷史原資料管理仍每頁 10 件。
- 收藏統計含歌曲及 Choice；歌曲列表分頁，Choice 與批次收藏管理從明確入口進原管理介面。收到的評論可打開原作品的既有評論 dialog；最新兩則可見評論放在表下。沒有評論就顯示真實空狀態，不填示意評論。
- 單首「編輯」只展開該首原編輯表，取消或儲存後關閉；Battle／對戰／勝出／Choice 等原操作集中在「更多紀錄」。原待接戰、批次管理、個人作品表現、頭像與身分修改仍可從這些入口取得。
- 投稿來源為「貼作品連結／上傳音檔」。音檔只選MP3，原位置標示「MP3 · ≤320 kbps · ≤30MB」，保留封面、metadata、手選曲風及選用試播；錯誤使用目前語言，不顯示無效預覽。MV只貼影片連結。2026-10-15起貼連結即自動讀取歌名、創作者顯示名與來源，失敗可「重新讀取」；歌名及作者可展開修改。「預覽作品（選看）」收合，不要求開啟或播放。必選曲風與AI工具保持緊湊並排；YouTube的MV勾選、權利確認及最後「確認投稿」放在同區。
- 音檔的本機預覽／試播同樣選用，勾選權利聲明且資料完整即可明確送出。封面、歌詞、MV、專輯與介紹等選填資料可展開；既有格式、大小、手選曲風、可選分析及審核規範保留。
- 預覽讀取與實際可播放是不同狀態，均不能宣稱版權已驗證。預覽不發布、不用額度，換來源重置權利確認並忽略舊請求回傳。頂欄手機常駐44px「投稿」入口；投稿網格與輸入欄可縮至320px，長標題最多兩行，選用預覽與確認按鈕不被水平溢出擠出畫面。
- 統計載入顯示「—」；讀取失敗有重試。Credit同位置顯示實際餘額，展開看最近50筆本人收支及待追回欠額；沒有資料顯示空狀態。Owner顯示免扣點。短說明列出每日回訪15、有效評分評論10、歌曲／MV送愛心3、盲聽3與額外成功投稿60；超出免費額度時需明確确认扣點，欠額未補足不能花點。
- 2026-10-25最新確認：創作者中心進入即展開互動通知，成功讀取且可見後自動標記當時既有通知已讀，頭像紅點／數字消除，不需逐則點開或回覆。通知仍每頁最多三則、單一平面摘要與時間、灰勾已讀，點開僅展開全文且同時一則。全部／未讀／已保留和翻頁同列；手機同列篩選及「⋯」保留／刪除，點按區至少44px、摘要最多兩行。載入後的新通知維持紅點，同頁再按入口也能重新標讀；背景頁不偷清。已讀儲存失敗在清單提示重試，不假裝成功。保存文案接在原副標，不增加說明卡；紅字／鈴鐺直達 `/profile?lang=<lang>&tab=notifications`，保留事件及舊hash相容。刪除／取消保留後重讀，最後一頁清空回前頁。原通知、評論、回覆、收藏、待接戰及三個月保留邏輯不變。
- 2026-10-25補回每列直接可見的刪除垃圾桶，接在評論／編輯旁，不藏於舊管理視窗。桌機保留同列，手機將44px三鍵靠右整合在該作品下方，長歌名不擠壓操作。四語確認提示說明退出公開展示與榜單、歷史保留及已用額度／Credit不退。成功即顯示已下架與成功訊息並重讀統計；僅停止該已刪除作品的播放器，其他作品繼續播放。失敗或取消不假裝下架，也不停止播放器。2026-10-26補正錯誤提示：只有登入失效／401要求重新登入；403提示本人權限、409提示重新整理、系統或網路錯誤提示作品仍保留並可稍後重試，不把所有錯誤都歸因登入。
- 桌機左右分欄；平板與手機把投稿區接在總覽下方，接著作品區。保留既有帳號／通知 dock，撤下 Profile 的重複首頁圖示、語言與現場 badge。手機／平板的帳號通知避開頂欄導覽，其他頁儲存位置不改。新中心與投稿文案有中英日韓；原管理細節沿用原介面。

## Admin / Operational UI

Role:

- Quiet, utility-first, dense enough for repeated work.

Direction:

- Admin pages can be more functional than public pages.
- Avoid oversized hero design in admin tools.
- Keep image/audio review and moderation actions clear.
- Repeated filter and sorting controls in one toolbar must share a consistent height, radius, type scale, and responsive grid. Do not let one control wrap into a tall pill while its neighbors remain short.
- Music-review lists use one compact play button per item and one fixed bottom preview player; do not embed a separate native audio bar inside every management card.

## 音樂分析工具入口

`/music-analysis` 使用精簡標題與三張工具卡：Tunebat、Loudness Penalty、Cyanite。每張說明用途、免費範圍與「怎麼使用」，主要按鈕另開外站，次要連結為官方說明。頁尾可回 Music Bible；桌機三欄、手機單欄，四語皆有完整文案。沒有登入等待、分析引擎狀態、範例評分、站內上傳、貼回結果表單或下載筆記。所有音樂分析由使用者自行在外站操作。

## AI Music Practice Bible

### 創作聖經四色路線（2026-10-15 使用者確認）

- 以核准黑底設計稿為準：共用黑橘導覽，精簡標題「創作聖經」、同列全書搜尋與分享。四個色塊依序為橘「先做出第一首」、綠「找到你的風格」、紫「讓作品更好聽」、藍「完成與發表」；顏色輔助分類，名稱／圖示仍須清楚。
- 接著是「先學這3招」：Style／Lyrics分工、七格聲音DNA（主曲風、次曲風、情緒、樂器、速度、調性、聲音質感）、副歌情緒。直接展開原招式或範例，不另複製一份教材。
- 下方桌機左側為常用招式／核心公式、舞曲能量、音色與混音、錄音室Mastering四分類，右側是卡關捷徑與教學／實測討論。招式名稱、複製內容與數量讀取會員真實catalog；不虛構熱門次數、學習進度或新增收費。
- 完整聖經收在五個可展開章節：起手與排錯、速查表、Prompt／風格／歌詞、拆軌、台語實驗室。原章節ID、索引評論、複製、試聽保留。搜尋或入口跳轉會展開目標章節；同一錨點再次點擊也能開啟。索引搜尋字詞保存在網址，避免延後載入時丟失。
- 手機四路線維持2×2，入門三招直向排列；常用招式隱藏長摘要，保留名稱與44px複製鍵。分類列可橫捲，完整招式庫的分類仍換行。黑底不改白底、縮短大片空白，不把原教材刪除。
- 前台不把資料標為新／舊或 Reference / Legacy Library，也不顯示新增 metadata 狀態。所有資料照常可搜尋與複製；平台、模型、版本、最後驗證與狀態先保留在資料層及 owner 編輯介面。原證據與來源說明保留。
- Ask Music Agent 尚未成立，入口與準備中需求單皆隱藏；待真正功能完成後另行開放。
- 新入口採繁中／英文；日韓會員內容沿用英文回退。公開登入入口維持四語，會員資料不移至公開頁。


- Studio Mastering Prompt examples use one compact `15 秒試聽` action only on cards with a real audio asset.
- Route every Prompt example through the shared fixed bottom player. Do not autoplay, expand card height with waveforms, or place a native audio control in each card.
- Keep the example disclaimer visible and quiet: the clip demonstrates a sound direction and does not promise an identical Suno generation.
- When `錄音室 Mastering` is selected, keep the second-level `錄音室類型` filter wrapped on narrow screens; use the 15 approved music-family labels (`Electronic`, `Hip-Hop`, `Soul & R&B`, `New Age & Ambient`, `Rock & Roll`, `Indie Dance`, `Disco & Funk`, `Jazz & Bossa`, `Pop`, `Classical & Cinematic`, `Latin & Caribbean`, `African & Amapiano`, `Asian & Middle Eastern`, `Country & Folk`, `DJ Edit / Extended`) and show the selected family as a compact orange card badge.
- `Modern Taiwanese Pop` is fully withdrawn from the free Prompt catalog. Do not leave a disabled card, premium lock, price, or placeholder in the free library; a future paid version needs its own approved product surface.


## Battle Pool 細節

### Purpose

Battle Pool should feel like a live AI music challenge stage, not a plain list of uploads.

The page must make visitors understand three things immediately:

- This is where AI music enters a public battle.
- Creators can start or accept a Drop challenge.
- The battle surface is music-first, stage-like, and usable on mobile.

### Core Feeling

Use:

- Black / near-black stage background.
- Red and orange light as battle energy.
- Red-orange for the main challenge CTA and small cyan accents for navigation.
- 復古音樂器材raster插畫支援三模式入口，撤下舊人物主視覺。
- Dark tool surfaces with readable contrast and restrained borders.

Avoid:

- Plain SaaS list pages.
- Stock marketplace layouts.
- Decorative or fake waveforms, EQ bars, deck controls, or audio controls that do not operate.
- Overly complex rule text in the hero.
- Mobile hero elements that overlap the title or CTA.
- PPT-style mastheads that push the public challenge pool below the first viewport.

### Main CTA

The main CTA is a real text-and-icon button.

Chinese:

- `發起挑戰`

English:

- `Start a Challenge`

Rules:

- Do not use `我要挑戰` for this primary CTA.
- Keep the button accessible: the actual button text and `aria-label` must match the locale.
- Use the crossed-swords icon with visible localized text.
- Keep it compact, high contrast, keyboard accessible, and visually separate from share.
- On click, it should begin the same Battle start flow as the normal `Start a Challenge` action.

### Battle入口與盲聽內頁

- 頂部使用全站Editorial導覽，Battle為目前頁；簡短「音樂鬥歌場」、對戰記錄及規則。撤下兩人物、舊大型hero及重複固定首頁／語系／guest登入／presence badge；登入後頭像與通知保留。
- 三個復古器材插畫區依序為盲聽入口、Q Crash、Drop Battle。深灰藍牆、暖檯燈及木桌保留黑底的空間感；主CTA橘色，Q Crash薄荷色。既有正式場次與挑戰池放在對應區域，空狀態一行，沒有示意投票。
- 2026-10-23三個模式標題旁加入44px圓形分享鍵，Q Crash薄荷色、盲聽與Drop暖橘色，不另加操作排。分享以模式介紹及當前語言開啟對應區域；即使頁面延遲掛載或挑戰池載入中仍可定位。系統分享、複製成功及手動連結提示沿用四語共用按鍵。
- 模式預覽各用同一入口插畫製作獨立1200×630圖：盲聽A/B隨身聽、Q Crash雙卡帶、Drop取樣機／混音器，英文模式標題搭配本地化metadata。主縮圖不再是品牌Logo；盲聽內頁直接分享也有盲聽圖，沒有實際匿名曲目資訊。社群平台既有快取需由平台重新抓取。
- `開始盲聽`直達`/battle/listen`；內頁有返回、標題與3點徽章、A/B播放器、同排偏好A／平手／偏好B及「離開評測」。匿名曲目不露封面／姓名；標題下明示每首至少8秒。答案成功自動接新題，保留上一題3點提示，隨時可離開。2026-10-24新增舞台下方的「剛剛選中的作品」緊湊小卡：投票前連歌名都隱藏，選A／B只揭曉選中作品的歌名、公開作者署名與封面；平手兩首各自成卡，未選中身分不顯示。小卡以原作品ID提供愛心收藏與共用播放器聽完整版，歌名可定位原探索作品；2026-10-24後續增補：桌機左側作品／操作、右側最近兩則評論與原署名，平手每首各有評論區，手機垂直排列。右側「評論與評分」在原頁開啟既有評價視窗，顯示原平均／評分人數及完整評論，使用歌曲1–10分、一位小數輸入，不預填；送出後刷新預覽。已有MV才增加同列「看完整MV」，明確點擊後才載入／播放，與評論共用原視窗及作品ID。開窗先暫停盲聽與完整版，保留下一題進度；關閉／Esc回原操作。四語44px控制、封面延遲載入，沒有追蹤作者功能或自動按心。下一題就緒不自動播放；完整版暫停盲聽、A／B恢復時關閉完整版，原聆聽進度保留。揭曉讀取失敗只重試揭曉，不重新投票／領點；切換帳號清除上一題小卡，不停在Next頁。
- 播放／暫停、30秒進度與重播是實際控制；每側聽滿8秒才解鎖該側拖曳／重播，兩側達標才能評选，伺服器同步核對。前台實際音訊＋時間計數不被heartbeat延遲卡住。舞台內HUD依序顯示準備播放／YOU READY?／聆聽中／LET’S GO開始評選／NEXT ROUND，不增加操作步驟；兩侧各自顯示0–7/8s及「可拖曳重聽」。A/B提早自動緩衝並從15秒起播，同時只播放一首；載入不計時，手機保持A/B並排、三選擇單排。HUD輕量進場／聆聽提示遵循reduced-motion。短說明、登入／載入／失敗／無題目狀態沿用深色緊湊區，不新增假排行榜。
- 四語文案與同路徑metadata；登入保留原`/battle/listen`及語言。手機較長title/reward可自然換行、主要控制至少44px，避免複製影片／設備字成UI。

### Battle Pool Header

The pool header should introduce the public challenge pool directly.

Use:

- Label: `60S DROP BATTLE POOL`
- Main title: `Drop Battle 公開挑戰池`

Do not use:

- `挑戰最強90s抓波`
- `挑戰最強60s抓波`
- Long rule explanations in the header.
- Empty motivational English slogans.

### Official Gatekeeper Cards

Official Drop cards should feel like challenge gates.

Use:

- `歡迎任何人來挑戰 AIPOGER 官方關卡`
- Actual song title.
- `GATE 01`, `GATE 02`, etc.
- Genre badge from the normal Battle genre menu.
- Highlight copy: `歡迎挑戰這首官方 Drop，設定開戰時間並分享拉人投票。看看你的歌能不能打`.
- Small music metadata such as BPM, key, and Drop duration when available.
- Red pill action such as `挑戰這首 Drop`.
- Put `挑戰這首 Drop` in the same action row as `5 秒預播`.

Do not:

- Repeat a section heading/subheading such as `官方 DROP 挑戰` / `歡迎任何人來挑戰` above the cards.
- Put star CTAs inside each Drop card.
- Let official cards look like normal ranking records.
- Show full audio controls on the card; teaser behavior is enough.

### Filters

Genre filters should be compact and direct.

Use examples:

- `K-Pop 韓式動感`
- `Rap 街頭說唱`
- `Disco / Funk / City-Pop`
- `R&B 深情瞬間`
- `Band Rock 熱血搖滾`

The genre source is the creator-selected upload genre. Do not treat it as a challenge type or platform category.
Battle Pool filters should not show `全部風格` / `All Styles`; the default unselected state still displays all official gates and open cards. Clicking the selected genre again clears the selection.

### Copy Rules

Battle Pool copy should be clear first, stylish second.

Use:

- `發起挑戰`
- `Start a Challenge`
- `Drop Battle 公開挑戰池`
- `挑戰這首 Drop`
- `約朋友一起挑戰`
- `邀請觀戰投票`

Avoid:

- `我要挑戰` as the main start CTA.
- `全部風格` / `All Styles` in the Battle Pool genre filter.
- Repeated section headings like `官方 DROP 挑戰` above official Gatekeeper cards.
- `挑戰最強90s抓波`.
- `挑戰最強60s抓波`.
- Rule-heavy explanations in the first viewport.
- Decorative English slogans that do not explain the action.



## 2026-09-06 第一批資訊層級

- Battle 模式介紹只保留一組標籤、短句與建立按鈕；無 Q Crash 時只顯示一行空狀態。有場次時保留青色 A/B 對戰卡區，不改資料與模式順序。
- Explore 的依類型／正在升溫控制放在個人推薦前；切到正在升溫時直接顯示熱度作品，個人推薦保留在依類型視角。
- 一般零戰績作品收起零挑戰數與不能操作的暫不接戰；探索封面的資訊按鈕依2026-10-14確認改為歌詞，完整正式戰績仍由對戰記錄／原管理讀取。依 2026-09-17 確認規則，所有認證標章與守擂 0/6 晉級進度退役；接戰狀態只依創作者明確選擇與實際資格顯示。
- 歌詞按鈕用點擊／鍵盤開啟，不靠hover展開內容；點面板外、Esc、同鍵或關閉鍵即可收起。播放、支持、分享與真實攻擂入口沿用；接戰呈現另議。
- 對戰記錄使用得票率；本月摘要和兩模式內容遵循同一月份。跨場 audienceCount 加總稱投票人次。
- Showtime／Choice 以本文件上方 2026-09-21 版面與編輯流程為準；未完成項目只列在 roadmap，文件整理不能當作發布證據。

## 音樂分析的表達框架

分析入口只提供外部工具的用途、免費範圍與操作方法，不製作 A&R 報告、歌詞診斷、市場評分或認證。Music Bible 六步流程的第三步為「三種分析工具」，按需前往 Tunebat、Loudness Penalty、Cyanite；第五步為在 Showtime 發現策展／創作者與從收藏歌曲製作 Choice，不設分析／認證前置門檻。BPM／調性、串流音量調整、曲風情緒標籤都是參考讀數，不代表品質或商業成功。

## 共用播放器

- 酒吧、探索、Showtime／Choice、個人歌單共用root播放控制：播放／暫停、歷史上一首、下一首、進度、手機／桌機音量、歌詞、關閉。音檔電台可見時收起底部控制；2026-10-15起酒吧曲風隨機佇列另納入YouTube連結，使用右下方可見官方小播放器（桌機約354×200px播放區，手機自適應），不拉大頂部電台或隱藏影片。音檔／YouTube互斥，播完自動接續；頁面隱藏／modal遮蓋時暫停YouTube，返回不自行恢復。來源失敗可下一首，瀏覽器阻擋時提示點播放器繼續。原公播作品按心／評論仍對應同一ID。
- 電台沒有舊六首佇列預覽或聊天室；顯示目前歌名／創作者及曲風，無聲音／無曲風作品時呈現明確狀態。
- 換頁維持目前音訊與佇列；選歌／選曲風才換佇列，新投稿不插入既有佇列。三個月到期或既有公開資格不符的歌曲由相同API剔除。

## MV分享及評論導覽

2026-10-23分享預覽：把單支MV連結貼到Facebook等平台時，使用該MV的影片封面與原作品歌名／作者，不使用全站Logo。伺服器先確認作品仍在公開MV清單，再挑選可用的YouTube縮圖；分享網址、canonical與og:url保留track ID及語言。社群平台已有的舊預覽快取不會因網站部署自動更新，必要時須重新抓取。

2026-10-15精簡評價版面：影片下方不另列「在 YouTube 開啟」，使用官方播放器既有來源入口。桌機把愛心／收藏、支持說明與分享鍵放在同一操作列；手機把愛心與分享並排，長說明緊接下一行並自然換行，維持至少44px觸控範圍。連播時才顯示原連播控制列。小數輸入旁合併「可填一位小數，例如8.7」與「評分送出後無法修改，文字評論可修改一次」，作者限制也使用同一說明位置；減少評分區上方間距。歌曲共用評價視窗沿用相同緊湊排列。2026-10-15後續定案：已評分會員的分數欄鎖定，既有文字預設唯讀，按「修改評論・剩餘1次」才編輯，儲存成功後顯示已修改；不提供會員刪除鍵。本人Owner的私有操作提供「修改評價」及「刪除評論」，自己的文字與分數可不限次修改，但不在公開說明列展示例外。錯誤保留草稿；已發評論Credit不追回、不因修改重發。不為輔助說明另增卡片或空白排。

卡片歌名最多兩行；點歌名直接開原MV／評論視窗，完整名稱自然換行，沒有卡片跑馬燈。MV原愛心與評論操作旁新增44px觸控分享鍵，桌機三欄與手機單欄不增加額外操作排；精選及播放視窗也有分享。原生分享、複製成功與手動複製連結提示有四語。站內分享保留原MV ID與語言，接收者開原作品的可播放封面與評論，不自動播放。

MV評論視窗保留原內容與草稿，使用橘色thumb／深色track及右下角「往下看評論」提示。提示只在評論入口仍在下方時顯示，點擊捲至評論、不發送留言，看到評論後收起；窄螢幕與reduced motion一起驗證。


本次發布在探索、MV、Showtime及Battle共用原黑橘「這裡怎麼玩？」入口、四語說明、原生dialog與44px關閉按鈕，保留Escape、點外關閉及入口焦點返回。指南分清會員Credit、作品人氣與正式Battle戰績。

公開四頁指南不顯示「期滿舊歌+5排行分」或「Owner免扣點」；實際計算與本人私有管理權限保留。指南入口使用15px加粗淺橘字、低亮橘底／框及至少44px高度，保留緊湊資訊列。320px手機Battle導覽可自然換行，四語入口不壓成窄多行。評論修改／Owner刪除成功即刷新公開清單和MV封面平均，不需重開；Owner私人投稿區僅顯示適用本人的不限額資訊，不再重複一般會員三首／60點說明；日韓音檔說明與中英一致。前三件是免費額度，畫面最高顯示3/3；第四件及後續有效投稿仍可按60點增額，不把額外成功件數當成無效額度，且每件都需扣點確認。盲聽在兩段播放期間唯讀準備下一題，維持8秒／自動接題／常駐離開。
