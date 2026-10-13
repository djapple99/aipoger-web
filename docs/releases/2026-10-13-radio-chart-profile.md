# 探索小電台、三個月人氣榜與 Profile 投稿發布

產品發布：2026-10-13 Asia/Taipei；應用 `6342878`，分支 `codex/homepage-mv-editorial`。從最新已發布 app `e8f2977`＋文件 `18ac55f` 的隔離工作區修改，未混入主 repo 既有其他變更。

## 已發布

- 傷心酒吧小電台合併 Explore，唯一 root audio 維持跨頁；選曲風循環、播放／暫停、歷史上一首／下一首、seek、volume與原ID評論／Heart。電台可見則收起固定dock，往下捲才显示dock，音訊不卸載。原酒吧chat、故事／歌詞牆与大舞台撤下。
- 三個日曆月（Asia/Taipei，月底clamp）公开單曲池，資料API完整分頁，每分鐘及返回可見核對；首頁單曲／Explore／電台／Top10／50一致。榜票是原作品現存Heart的不同非作者登入會員人數；跨天不重複、零票無假排名、同分同名次。不改七日升溫、正式Battle和Showtime月榜。
- 左兩欄寬Top10、右四首封面；手機兩欄，緊湊3首排行預覽／Top50原生視窗。Top10無評論標誌，歌曲卡／電台／dock有白評論旁橘心；榜單歌名清除不相符篩選並展開、定位／focus／短暫標亮原卡，評論同ID modal，不另建歌曲頁。
- 投稿從共用頂欄／首頁頁尾直接進Profile自己作品區，原舊hash相容。沿用原檔案、metadata、hash、審核、個人168小時三首与每曲風五首active限制；失敗保留draft並清理該次資產，帳號變動／私有讀取失敗／double submit有防護。Profile完整Data改版與歷史最高名次未實作。
- 超期僅退出公開展示，Profile／歷史／storage原作品保留；沒有自動刪檔、SQL、環境變更或點數啟用，不退上傳額度，也不降低DB active限額計數。MV既有外部連結展示不受本次單曲期限裁切。

## 驗證與部署

- `npm test`：532項，501通過／31既有可選DB略過／0失敗；文件更新後重跑亦同。新單元／API／runtime覆蓋日曆期限／distinct support／500+曲庫與1000+Heart分页、radio/chart原ID、Profile上傳成功／失敗／額度／格式／session／併發。
- `npx tsc --noEmit`、本機與雲端production build通過；lint0 errors／15既有warnings；`git diff --check`通過。
- Vercel production部署先`--skip-domain`建置及資料檢查，READY后promote：`dpl_BjHkGMG8YcpcFXtHBCXNcrDBb5iB`，`https://aipoger-web-rnz8-99op4i7xs-yohungs-projects.vercel.app`。Vercel aliases确认apex `aipoger.com`及`www.aipoger.com`均指向此deployment。
- 實際API目前113首展示合資格单曲，其中66件有非作者支持（验收当下）；`/api/listen-bar/tracks`与Explore完全同ID集合。没有删除此前225首历史原记录或制造示意排行榜。
- HTTP：首页／MV／auth／Profile／listen-bar／曲風短鏈／兩個tracks API均200。正式浏览器Jazz音讯advanced >88s，readyState4；原ID评论加载既有公开留言，auth return保留track/comments=1，Top50有50原作品，chart无comment icons，歌名清除不相符search定位原卡。
- 桌机与手机zh/en/ja/ko实际DOM／截图检查、320与768本机额外检查，不产生document横向溢出。参考与实现同1487x1058并排比对；private screenshots位于工作区`outputs/aipoger-radio-chart-release`，不上传或提交。
- Guest Earworm真實测验返回与原taste profile保留；正式站未使用live owner session、写入测试投稿／评论／Heart。Login后原表单的写入成功／失败在隔离runtime中验证，未伪称生产owner写入已验收。
- 六份正文中五份有变更，加固定云端索引，同既有Drive IDs原地更新并完整读回逐字相等；营运正文没有本次变更。规范同步不生成dated/final/v2副本。

## 回復

前正式 app `e8f2977`，READY deployment `dpl_M3wZ23ATz3CPV6vjo9uUZkiYgKZW`，`https://aipoger-web-rnz8-po3krpap6-yohungs-projects.vercel.app`。如需回復仅promote原deployment；没有DB migration需要回滚。恢复画面不能重启已退休生存淘汰。
