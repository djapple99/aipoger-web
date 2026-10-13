# 2026-10-14 Battle入口、30秒盲聽與混合人氣榜

- 應用commit：`0a36bf6`；發布分支：`codex/homepage-mv-editorial`。後續文件commit不改執行程式。
- Vercel：`dpl_2cEZeFgVyCoywmn4ktnUz9vjZ2CS`，READY；`https://aipoger-web-rnz8-fuwuarckt-yohungs-projects.vercel.app`。使用既有project `prj_2vuiLRv5OYE9mcAG3AF4oLZYK6G5`，先production環境skip-domain檢查，再promote至apex／www，未新增project／環境／權限或關閉deployment protection。
- 正式入口：[Battle](https://aipoger.com/battle?lang=zh)、[盲聽](https://aipoger.com/battle/listen?lang=zh)、[探索榜單](https://aipoger.com/ai-music?lang=zh)。

## 實作範圍

復古器材raster取代原人物，深灰藍／暖橘／薄荷入口依序盲聽、Q Crash、Drop Battle；原正式Q卡、Drop池、官方關卡、投票／密封／戰績均保留。匿名A/B同曲風，各原歌15–45秒；聽完才選A／B／平手，均每題3Credit，再揭示原作品。每會員同無序pair只記一次，不因交換／重送再發點。Credit私人API讀獨立ledger，移除原作品不抹除已賺點；Owner保持免扣點。

Explore Top10／Top50共用50%Heart＋50%盲聽：Heart除以曲庫最大不同支持者數；每聽眾同曲多配對平均後，以(P+5)/(N+10)校正盲聽偏好，無樣本中性。綜合分顯示「分」，不同Heart／盲聽人數仍可查；首頁MV本週支持、MV十分制、Showtime月榜、正式Battle不混入此計分。

第一版只用現有公開音檔≥45秒，不下載／隱藏外站播放器或新增Storage剪輯檔。連結投稿仍有Explore／Heart資格。登入15／有效評論10／額外投稿60及聖經2點尚未啟用，不把新ledger誤稱完整APC經濟。

## 資料庫與權限證據

Supabase project `rwueinzgjaaefjvmsyem`，實際migration history與repo固定檔名一致：

1. `20261013155500_blind_listening.sql`：私人questions、Credit ledger及service-only RPC。
2. `20261013155923_blind_credit_history.sql`：移除Credit來源cascade，保持已賺點歷史。
3. `20261013164348_blind_listen_timing.sql`：伺服器時鐘餘量處理網路抖動、null檢查及FK索引。

兩表RLS、撤銷anon／authenticated直接權限；五個RPC為SECURITY INVOKER、固定search_path、只有service_role可執行。伺服器getUser驗證Bearer，不接受客戶端身分；audio使用HMAC ticket與本project Storage Range轉送，拒絕外站／redirect／篡改票，音訊源不在題目JSON揭露。

`tests/blind-listening-db.sql`已實際交易式驗證self-author拒絕、pending續題、快報限速、2.3＋1.7秒網路抖動、未聽／外帳號拒絕、平手3、重試0、無序pair去重、隱藏／到期、每聽眾同曲平均與Credit歷史；所有fixture Auth／曲目／quota／Credit完整ROLLBACK。新增兩張service-only表的RLS-no-policy INFO，Security advisor14項既有definer WARN及1項Auth WARN維持，沒有新增WARN。

## 程式與設計驗證

- TypeScript、本機正式build、Vercel雲端build通過；lint 0 errors／15既有warnings。
- 585測試：554通過、31既有可選DB略過、0失敗。新增API／音訊ticket、排行數學、真實元件runtime（播放範圍、retry保留原選擇、揭示／Next、換帳號及四語）與SQL交易測試。
- 過時兩個純視覺source-pattern斷言移除；原Q Crash／Drop實際資格、正式投票和結算contracts保留。
- [設計QA](../../design-qa.md) final result passed；來源與渲染成對比較、修正徽章／CTA、標題大小、重複guest入口、桌面背景重複設備及手機長語系。桌機1440×1024、手機390×844／320×812。
- 隔離fixture只用於驗證實際元件的vote／reveal UI；讀真實公開音訊但不呼叫正式投票／Credit，不建立正式fake Auth帳號。正式發點語意由完整回滾SQL及runtime驗證；未冒用人的偏好留下正式票。

## 正式站驗收

- apex `/`、`/battle`、`/battle/listen`、`/mv`、`/profile`、`/auth`、`/battle/setup`為200；新四張WebP為200。未登入blind API401、無效音訊ticket404。
- 公開曲庫API119首（驗收當下）均帶新sample與score欄位；新盲聽票數為0，無虛構評測。DB初篩113首音檔／13曲風，實際配題另過來源、原資格、本人排除及曲風篩選。
- 正式已登入瀏覽器實際取得一個匿名pending題並播放兩首；A duration122.239979、B243.04，兩次均從15開始、在45自動pause，伺服器heard_a=30／heard_b=30。聽完三個選擇解鎖，來源題目仍不露作者／封面，console errors空。未送出正式選擇：questions1、votes0、credit_entries0，pending按原2小時到期規則保留。
- 正式頁面手機390px與320px、四語兩頁均核對；既有帳號dock不遮標題／主要按鈕。原正式Q/Drop資料與評論／支持未改。Guest登入保留`/battle/listen?lang=...`。
- 正式Owner創作者中心已核對「免扣點」「盲聽獎勵已啟用」與空收支；展開紀錄明示其他獎勵尚未啟用。未投稿或扣點。
- 截圖存在私人workspace `outputs/aipoger-blind-release/`：`production-battle-desktop.jpg`、`production-listen-desktop.jpg`、`production-battle-mobile.jpg`、`production-listen-mobile.jpg`。未提交／上傳這些本機截圖。

## 回復方式與限制

若有回歸，promote先前`dpl_CqDWx7SYkY1t2ktMpjMxqpZfy8xN`／app9cb1b9b；加法式schema可保留，不刪使用者Credit／題目資料。前端計時加伺服器時鐘限制快速偽造，仍不宣稱能證明聆聽注意力。有限歌曲配對用完會提示，沒有每日不同題目上限。
