-- AIPOGER Drop Battle v3: battles table 支援 pending 狀態與 founder 取消。
-- Run after supabase/20260603_drop_battle_scheduled_start.sql
-- Run after supabase/20260603_copy_queue_schedule_to_battles.sql
--
-- 為什麼需要這個 migration：
-- 1. 原本 battles.status 只允許 'live' / 'finished' / 'cancelled'，沒有 'pending'
-- 2. 原本 fighter_b_user_id 是 NOT NULL，沒辦法表達「founder 開了局但還沒人接」
-- 3. v3 的「1 分鐘無人接戰自動取消」需要 'cancelled_no_challenger' 狀態
-- 4. v3 的 founder 手動取消（Task 7）需要 'cancelled_founder' 狀態
--
-- 沒跑這個 migration 會壞：
-- - Task 6 cron 的 `WHERE status = 'pending'` 會被 SQL reject（invalid enum value）
-- - Task 6 cron 的 `WHERE fighter_b_user_id IS NULL` 永遠 0 筆
-- - Task 7 founder 手動取消的 `status = 'cancelled_founder'` 也會被 SQL reject

-- 1. fighter_b_user_id 改 nullable（pending 狀態時為 NULL）
alter table public.battles
  alter column fighter_b_user_id drop not null;

-- 2. status check constraint 擴充
alter table public.battles drop constraint if exists battles_status_check;
alter table public.battles
  add constraint battles_status_check
  check (
    status in (
      'pending',                 -- 已成立但 fighter_b 還沒人接（v3 新增）
      'live',                    -- 開打中
      'finished',                -- 已結束
      'cancelled',               -- 既有 legacy
      'cancelled_no_challenger', -- v3 自動取消（無人接戰）
      'cancelled_founder'        -- v3 founder 手動取消
    )
  );

-- 3. 註解（給未來看 schema 的人）
comment on constraint battles_status_check on public.battles is
  'Battle lifecycle: pending (v3, waiting challenger), live, finished, cancelled (legacy), cancelled_no_challenger (v3 auto), cancelled_founder (v3 manual).';
