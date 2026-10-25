# 本人已發布作品刪除入口修復 — 2026-10-25

**後續修正：** d7dfdeb雖補回入口，卻改短內部刪除標記，與既有正式DB guard不相容，造成公開作品下架失敗；本輪mock及正式按鈕／訪客401驗收未涵蓋此觸發器，不能作為成功下架的證據。2026-10-26以8579b7a修復，補真實PostgreSQL測試與正式guard來源對帳，見[後續report](2026-10-26-creator-delete-guard.md)。以下保留當輪實際驗收範圍。

使用者回報一般會員不能刪除自己誤發的作品。應用 `d7dfdeb`、分支 `codex/public-rule-copy`，Vercel `dpl_8PV9p2tbVF31a6aXPeGE1sTNv12x`（`aipoger-web-rnz8-elb37nyk3-yohungs-projects.vercel.app`）於台灣時間2026-10-25 23:44:47 READY，已promote至aipoger.com／www。正式網域與部署ID／SHA已回查一致。文件收尾：2026-10-26。

## 原因與結果

- 新版CreatorCenterLayout每列只有評論與編輯，漏了刪除入口；舊管理視窗仍有本人撤下功能，既有remove-track API也已允許本人下架已發布community作品。根因不是一般會員被禁止刪除。
- 每列直接補上垃圾桶，桌機與評論／編輯並列；小手機三個44px操作鍵接在作品資訊下方靠右。一般會員與Owner均適用，歌曲、MV連結與專輯沿同一原作品ID處理；推廣期結束仍可下架。
- 確認提示顯示實際作品名、退出公開頁與排行榜、歷史保留及已用投稿額度／Credit不退。成功後即標已下架並重讀統計；私人紀錄仍可由已下架篩選查看。取消不送出，失敗保留作品與重試機會，連點不重送。
- 沿既有API設is_active=false、review_status=removed、removed_at／updated_at與管理註記；不刪作品資料列、原音檔、留言、評分、愛心、戰績或Credit流水。原投稿額度與點數不退款規則保留。
- 服務端由auth.getUser驗證實際會員，拒絕訪客／過期／匿名登入與他人作品。UPDATE再次約束原ID、本人created_by、community與啟用狀態；查詢後作者或狀態被改時不假裝成功。已下架的本人作品重試回成功，不改寫原下架時間。回應private/no-store，既有舊schema回退保留相同權限條件。
- 僅在成功下架正在播放的同作品時關閉該播放器；其他作品播放、原評論／評分與對戰流程不變。

## 驗證與界線

- 新增14項真實TS執行／隔離DB與元件runtime測試：正常會員自己的歌曲／MV／專輯成功；訪客／匿名／過期／他人／official拒絕；重試冪等、UPDATE競態、取消、API失敗、換帳號、連點與四語提示。正向寫入使用隔離mock，沒有以真人會員的正式作品進行刪除測試。
- 全套852項：816通過、36既有選用測試略過、0失敗。TypeScript通過，lint0 errors／9既有warnings；本機webpack與Vercel原雲端build通過。移除臨時QA路由後清理舊生成的路由型別再驗，最終build無fixture。node_modules既有跨worktree symlink不符合Turbopack root，沿前輪使用webpack作本機build，雲端原build正常。
- 一般會員isOwner:false隔離版型：1440×900桌機四個刪除鍵均44×44；320×844中英日韓各scrollWidth305px、四個刪除鍵，三操作均可使用，無水平溢出。fixture只含虛構作品，沒有Auth／正式寫入；臨時route已移除且未部署。
- Supabase只讀核對原欄位及Security advisor；本輪沒有schema migration、RLS／Storage／Auth／額度或Credit規則變更，也沒有生產資料DML。
- staged READY API與正式網域訪客POST均回401、Cache-Control private/no-store；以不存在的UUID驗拒絕，無寫入。BUILDING時的Vercel暫存200頁未當作API成功。
- 正式已登入Chrome的新驗收分頁確認14件原作品、第一頁四列垃圾桶可用、每個44×44；1575px視窗scrollWidth1560px，無水平溢出。沒有按刪除或送確認；console error為空。正式介面驗收使用既有登入帳號，一般會員行為由前述隔離測試驗證，不宣稱真人一般會員已執行刪除。
- 私人證據位於 `New project/audits/2026-10-25-creator-delete/`：一般會員桌機／四語手機截圖、layout-checks.json、production-my-works.jpg、production-delete-actions.png、production-guest-api.json。測試／lint／build log在本機/tmp；不將真人作品清單或會員資料提交公開repo。

## 修改檔案與文件

應用修改 `src/components/creator-center.tsx`、`src/components/creator-center.module.css`、`src/app/api/listen-bar/remove-track/route.ts`，新增 `tests/creator-work-removal.test.mjs`。產品規則、體驗、工程、固定索引、agent與本report原地更新；Google Drive沿既有ID同步，無新增第二套規格。後續文件commit與應用SHA分開記錄。

必要時可promote前一READY部署 `dpl_DYaF89v334r7SmmgnqXeqJepc7Bz` 回復應用；沒有SQL回滾或檔案清除需求。
