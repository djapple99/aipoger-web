# Choice 批次選曲與手動儲存（本地，未部署）

使用者要求先修正，稍後再一起部署。本次未 commit、push、部署或執行正式 SQL；前一輪 Choice 版面修改保留。

## 行為

- 連續勾選最多 10 首，搜尋／類型切換不清除暫選；按「確定選曲」放入本地待儲存歌單。
- 播放順序直接選擇目標數字，其他歌曲補位；不逐首呼叫 API。
- 標題、文章與封面修改保留在 React 編輯狀態；移除 900ms 自動存檔與逐字 localStorage 寫入。
- 明確按儲存／發布／撤回才送出已確認的整份編輯。未確認選曲先提示；離開、切換期數、重新載入前提示未儲存變更。
- 保存失敗保留編輯；帳號切換仍清空私有狀態並取消舊請求。

## 程式與待發布依賴

- `src/components/creator-choice-workbench.tsx` 為共用實作，正式 `/profile/choice` 頁面不傳預覽參數；設計預覽僅在 development 注入獨立記憶體 transport，production 預覽路徑 notFound，不繞過正式 API 驗證。
- 新 `save_editor` action 驗證本人、歌曲來源、收藏／公開播放、新增與保留歌曲差異、去重、10 首上限與發布至少 5 首。
- `20260921150000_creator_choice_batch_editor.sql` 增加 service_role 專用 RPC。交易一次保存標題、文章、發布狀態與全部排序；保留未移除歌曲的 item ID；過期編輯快照拒絕覆蓋。舊 action 保留相容。
- 未套用正式資料庫。將來合併發布前必須先套用此 migration；封面檔案仍使用既有獨立上傳，若失敗保留檔案並刷新已存文字／選曲基準，以便重試。

## 驗證

- 全部 458 個測試通過、0 跳過，包含 PGlite 執行實際 migration、批次重新排序、失敗 rollback、舊快照／其他帳號拒絕、公開歌單替换、撤回、函式 grants。
- TypeScript、修改檔 ESLint、git diff check 通過。
- Production build 通過。原本機 .env 的公開 Supabase URL 無效，因此建置使用單次環境覆寫的明確測試值（build-check.supabase.co / build-check-public-key）；不修改任何環境檔、不宣稱驗證正式資料串接。
- Chrome 實際操作相同編輯元件：中英文輸入＋勾滿 10 首＋第 10 首移第 1 首，儲存計數為 0；按儲存後為 1，順序為連續 1–10。
- 模擬儲存失敗後保留標題與 5 首選曲，再按儲存成功。390px 手機無水平溢出；中英日韓均顯示在地化確認按鈕。預览 transport 不寫入正式資料庫。

本地試編：http://127.0.0.1:3100/design-preview/choice-editor?lang=zh
版面預覽：http://127.0.0.1:3100/design-preview/choice?lang=zh
