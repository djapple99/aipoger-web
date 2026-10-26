# 2026-10-27 Boom Bap 錄音室 Prompt

使用者提供四張截圖，要求歸納到錄音室Prompt、支援一鍵複製，這批先不做聲音試聽。四張共11段英文Prompt，分成8種風格方向，三組相近風格保留兩個不同版本。

- 應用commit `58d3997`，GitHub `codex/public-rule-copy`已推送。
- Vercel `dpl_GpasoNYNHgsyvZ2zuSL5rRXXwgvE` READY；production --skip-domain驗收後promote同一build，apex識別相同。
- [正式第一段](https://aipoger.com/ai-music-bible?lang=zh#bible-move-studio-mastering-boom-bap-east-golden-vinyl)，完整教材仍依既有會員權限。
- 待驗收網址 `https://aipoger-web-rnz8-l4fg7knul-yohungs-projects.vercel.app`；回滾目標 `dpl_GjpSN29pChZKdKvLee5YHAsF9Fd8`（`0968840`）。

## 整理內容

新增`suno-boom-bap-studio-prompts.ts`，沿既有Studio Mastering／Hip-Hop分類，加入繁中／英文標題、摘要、用途、區域／器材／曲風搜尋詞；複製內容保留截圖原英文，只有跨行空白整理。不把參考藝人名字插入Prompt，不替生成音訊或模型版本背書。

| 分類 | 段數 | 版本 |
|---|---:|---|
| 東岸 | 6 | 經典黑膠／MPC3000、爵士暖銅管／Rhodes磁帶、暗黑鼓勁／冷調重低音 |
| 西岸 | 2 | G-Funk融合、加州地下爵士取樣 |
| 南方 | 2 | 亞特蘭大有機靈魂、德州低調重拍 |
| Lo-Fi融合 | 1 | 灰塵黑膠器樂方向 |

Studio文字100→111，全Prompt163→174；原100音訊映射與檔案未改，新增11段沒有試聽按鈕或佔位。metadata為Experimental，model／modelVersion／lastVerifiedAt為null，來源明確記為使用者2026-10-27截圖。原教材ID／順序、Owner override、會員全文、前輪播放／暫停修復與所有作品互動保留，沒有DB遷移或新排程。

## 驗證

- 33定向測試通過：111／174資料接入、11個不同Prompt與原BPM、三組近似版本不誤刪、區域分類、member catalog／metadata及原100音訊保持；新11項audio lookup皆null。
- 全套896項：864通過／32選用略過／0失敗；TypeScript、本機webpack與Vercel build通過，ESLint0 errors／9既有warnings。原測試中163段／全Legacy的假設更新為174段與明確提供metadata優先，原資料仍逐項比對；新音訊缺省回傳null的測試依既有合約修正，沒有修改API。
- 正式已登入會員頁11個新ID全部存在，DOM的11段pre正文與整理稿逐字相同，中英皆11段、零新增試聽按鈕。實際選「錄音室Mastering→Hip-Hop」搜尋Boom Bap顯示11招，可展開全部。
- 點擊「複製這一招」會回報「已複製」，該狀態只在navigator.clipboard.writeText成功後出現。Browser工具的剪貼簿讀回為空，故不宣稱額外完成clipboard字串逐位元組讀回；頁面複製來源／正文及既有完整文字複製測試均已核對。
- 1440px桌機、中英320px手機無水平溢出，標題與英文Prompt可換行，沿用原一鍵複製。沒有播放本批音訊，也沒有製作音訊檔。
- 正式8項HTTP通過：聖經四語／首頁／新聞200、會員全文API401、原Classic Disco MP3與來源SHA-256相同；前版新聞一大兩小仍在。runtime error／fatal查詢0筆，查核另存，未製造正式評分／留言／獎勵。

證據：`/Users/huangyihong/Documents/New project/audits/2026-10-27-boom-bap-prompts/`，含四張來源檔名與11項轉錄、正式DOM／分類／手機、複製提示、測試／build與部署識別。會員全文截圖只存本機證據，不進公開程式庫。已沿既有Drive ID更新agent／rules／experience／engineering／index共5份，連同未改動的growth／roadmap共7份讀回逐位元組相同（證據：drive-verification.json）；營運與roadmap不變，未把本批音訊製作自動列入待辦。
