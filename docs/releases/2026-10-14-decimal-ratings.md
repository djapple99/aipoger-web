# 歌曲／MV小數評分與累積人氣榜

發布日期：2026-10-14 Asia/Taipei。應用 `831354a`，發布分支 `codex/homepage-mv-editorial`。
Vercel `dpl_EfQmaeynk7U43oSjxt4bEzkvtQKo`，`https://aipoger-web-rnz8-njz0hwv29-yohungs-projects.vercel.app`，Ready並promote至aipoger.com／www。

## 最終行為

- 音樂／MV評價共用原作品ID、一人一作品一筆最新1–10分，最多一位小數，改成手填數字／10。一般評價表單要求分數，可搭配280字感受；作者可只留言，不能自評。跨面修改替換分數，不增加人數／灌分；保留原留言者名稱、管理、通知及MV連播草稿／busy鎖。
- 公開評分平均為有效分數總和／不同評分人數，平均顯示一位小數；排行使用實際總和，不把已累積總分再次乘人數。有效關聯留言被隱藏時原分數同樣排除。
- Explore人氣總分＝3×不同非作者有效Heart支持者＋每人最新有效評分的總和＋3×盲聽偏好點＋適用的原新歌3／期滿回歸5加成。盲聽每位聽眾對同曲不同配對先平均，勝1／平手0.5／負0，偏好乘3；不因同曲遇到更多對手灌分。沒有樣本貢獻0，不再用50／50比例、最大Heart歸一化或中性先驗。
- 至少有有效Heart、正盲聽偏好或有效評分才入榜；按最終總分降序，同分直接原投稿時間新歌先，再ID穩定排序，名次1–50連續。首頁本週MV、Showtime與正式Battle資格／成績沿原規則。
- 手機小數鍵盤、超範圍／兩位小數停用提交，保留未送出草稿；同作品先後從音樂／MV送出走同一receipt與評分表。首次表單不預填分數。歌曲平均／10放在創作者原行，不新增操作排。兩種評論視窗用橘色捲軸，手機長歌名較小完整換行。
- Credit與歌曲分數分開。本次未發歷史Credit，也未啟用送愛心者3／20字有效評論10／登入15等新發點；盲聽3Credit仍正常。

## 資料庫與验证

- 既有score轉numeric保持原值，範圍1–10及一位小數由DB／API共同核對。新`work_rating_summaries`及`save_work_review`均service-only SECURITY INVOKER、空search_path，RLS／table grants沿原private模式。舊integer `save_mv_review`及rounded `mv_rating_summaries`保留相容。Supabase migration version `20261014082709` 已確認。
- `tests/sql/decimal-work-reviews.sql`交易完整回滾：4.8／6.8的有效平均5.8、總和11.6；修改為9後平均7.9／總和15.8且人數仍2；跨面receipt重送只一條留言；NaN／Infinity／0／11／4.85拒絕；作者、文字-only、moderation及隱藏、grants通過。前後正式評分與receipt都0筆；沒有留下fixtures、評論、通知或額度。
- 609 tests：578 pass、31既有optional DB skip、0 fail。TypeScript與本機／雲端build通過；lint0 errors／15既有warnings。最後首頁MV相容修訂另有6項focused runtime tests及TypeScript通過。
- Security advisor前後一致：21筆service-only RLS no-policy INFO、14筆既有definer WARN、1筆既有Auth WARN，無新增WARN。
- Staged／正式公開API核對218作品及50個连续名次，分數公式不符0、明確排除名單漏出0、同分新歌排序錯誤0。公開MV／音樂review GET均200，不登入只回彙總且不可寫。首頁、Explore、MV、Battle、blind、Auth及Profile health均200。
- 真實Chrome正式頁面可輸入8.7，8.75提示且提交停用；歌曲卡片／電台都能開原評分視窗；320px手機無水平溢出。沒有對真實創作者送出測試評論／評分；實際原子保存以SQL回滾fixture與API身份測試驗證。手機僅viewport測試，非iOS真機。

驗收圖位於私人工作區`outputs/aipoger-decimal-ratings/`；核對摘要位於`audits/2026-10-14-decimal-ratings/`。暫存部署worktree只含本次commit與既有project metadata，不複製環境檔。無歌曲／音檔／歷史刪除、Showtime選曲或Auth設定修改。
