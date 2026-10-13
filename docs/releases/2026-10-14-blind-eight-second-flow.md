# 2026-10-14 盲聽8秒、自動接題與載入優化

- App `621e2b3`（主功能`8b41f2d`＋手機提示縮短），分支`codex/homepage-mv-editorial`。
- Vercel `dpl_Dpfro1VPxLnjYbta7xs3S3jRjmvE` READY，先production skip-domain驗證再promote至apex／www；`https://aipoger-web-rnz8-o30rbkqfr-yohungs-projects.vercel.app`。
- 正式入口：https://aipoger.com/battle/listen?lang=zh 。原正式Battle／Q Crash、3Credit含平手、50／50探索榜、Owner免扣點不變。

## 使用者確認的新流程

A/B原歌第15–45秒、每段最多30秒；每側至少聽8秒即可給偏好，7.999秒仍拒絕。標題下和選擇區明示最低聆聽時間。成功記錄答案直接接下一題，保留上一題3點提示；常駐「離開評測」，無需投票亦可離開。不再要求Next或停在揭示頁。失敗保留原選擇重試，新題讀取失敗保留已完成收入，只重試讀題。

## 載入路徑

- 答案POST成功回應直接帶下一題，省去原揭示讀取與另外GET；不在取題讀全本Credit歷史，Creator Center仍讀真實ledger。
- 配題的曲庫、本人已見pair與樣本讀取並行；作答驗資格只查本題兩首，維持原生命週期／原曲風／自身排除。
- A/B各自先載入metadata與15秒定位；切側先暫停原側，同時只能播放一首。離開／換題／換帳號停止兩側、清除來源與舊請求。
- 音訊來源整合RPC：原question讀取＋eligible RPC＋track路徑三次DB往返縮至一次`blind_audio_source`；HMAC ticket、隱藏來源路徑、Range、禁止redirect及當前資格核對保留。沒有另存素材、改外站連結或關閉登入保護。
- 不保證所有來源或網路都在固定毫秒內完成；本次驗證準備好後兩側播放皆使用已載入音訊，並檢查請求數減少。

## 資料庫

Supabase `rwueinzgjaaefjvmsyem`，正式migration `20261013173824_blind_eight_second_flow.sql`已套用，history檔名一致。只替換完成門檻與新增source讀取函式，不改既有票／Credit／Auth／RLS資料。

complete與audio-source都為service-only SECURITY INVOKER、固定search_path，anon／authenticated execute=false、service=true。交易測試確認A7.999或B7.999拒絕、8／8成功和平手3點、retry0、同無序pair去重、外帳號／own-song／隱藏／到期、音訊來源資格、Credit歷史；所有fixture完整ROLLBACK。Security advisor沒有新增WARN。

## 驗收

- TypeScript、本機正式build、Vercel雲端build通過；588測試557通過、31既有可選DB略過、0失敗，手機提示修改後四語9項runtime另通過。lint0 errors／15既有warnings。
- 實際React元件隔離Chrome：初始兩側readyState4且time15；A9.231875秒時只有A達標不可選，B9.201568秒後可選，未播完30秒即可作答。選A後自動進fixture-q4，單一成功回應更新新來源、進度／門檻歸零，上一題3點提示保留。平手與偏好A都實測自動新題。
- runtime確認換題不另GET、30秒仍停45、A/B不重疊播放、重試保留原選擇、新題錯誤不重投、guest可離開／不能投、換帳號清獎勵；SQL核對精確8秒邊界。隔離fixture不寫正式票／Credit。
- 桌機1440×1024、手機390×844／320×812，四語無水平溢出、console error空；中文提示縮短以免兩個字成孤行。離開提供正常Battle路徑，手機三選擇保持單排。
- stage環境新頁200，未登入API401、無效ticket404；正式站兩側均readyState4、paused且定位15秒；B按播放即使用已備音訊，A保持paused。按離開後到`/battle`、兩個盲聽audio已卸載，無需作答；8秒警語與Exit實際可見。實際偏好沒有由agent代替人選擇。
- 私人截圖：`outputs/aipoger-blind-release/blind8-local-desktop.jpg`、`blind8-local-mobile-final.jpg`及`blind8-production-desktop.jpg`／`blind8-production-mobile.jpg`；未提交本機截圖。

## 回復

若需回退，promote上版`dpl_2cEZeFgVyCoywmn4ktnUz9vjZ2CS`；舊頁仍等30秒，因此8秒門檻不使舊流程無法投票。新函數保留即可，不刪使用者票或Credit。要恢復舊聆聽門檻須另經使用者決定。
