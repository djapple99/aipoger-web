-- AIPOGER MVP：battles / user_profiles 欄位升級 + APC 點數與等級
-- 請在 Supabase Dashboard → SQL Editor 執行（建議在 user_profiles.sql、battles.sql、user_profiles_aipo_coins.sql 之後）。
-- 執行完再跑 supabase/chat_and_votes.sql（含 Realtime publication 段落），或改貼「整包」：supabase/one_shot_mvp_and_publication.sql
-- 驗證欄位與 publication：supabase/verify_mvp_schema.sql（僅 SELECT）

-- ============================================================
-- 1. battles：AI 工具標示 + 勝者
-- ============================================================
ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS ai_tool_a TEXT,
  ADD COLUMN IF NOT EXISTS ai_tool_b TEXT,
  ADD COLUMN IF NOT EXISTS winner TEXT;

COMMENT ON COLUMN public.battles.ai_tool_a IS 'Fighter A AI tool (e.g. Suno, Udio)';
COMMENT ON COLUMN public.battles.ai_tool_b IS 'Fighter B AI tool';
COMMENT ON COLUMN public.battles.winner IS 'fighter_a | fighter_b | NULL if undecided';

ALTER TABLE public.battles DROP CONSTRAINT IF EXISTS battles_winner_check;
ALTER TABLE public.battles
  ADD CONSTRAINT battles_winner_check
  CHECK (winner IS NULL OR winner IN ('fighter_a', 'fighter_b'));

-- ============================================================
-- 2. user_profiles：APC 點數、勝敗、等級、簽到時間、AI 偏好
-- （與既有 points / aipo_coins 欄位並存；前端可逐步改用 apc_balance）
-- ============================================================
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS apc_balance INTEGER NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS total_wins INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_losses INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS last_sign_in_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ai_tool_preference TEXT;

COMMENT ON COLUMN public.user_profiles.apc_balance IS 'APC balance (challenge economy)';
COMMENT ON COLUMN public.user_profiles.level IS 'Ladder level derived from wins (see calculate_user_level)';

-- ============================================================
-- 3. 等級計算（依勝場數）
-- ============================================================
CREATE OR REPLACE FUNCTION public.calculate_user_level(wins INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
  lv INTEGER;
BEGIN
  CASE
    WHEN wins >= 150 THEN lv := 10;
    WHEN wins >= 110 THEN lv := 9;
    WHEN wins >= 85 THEN lv := 8;
    WHEN wins >= 60 THEN lv := 7;
    WHEN wins >= 40 THEN lv := 6;
    WHEN wins >= 25 THEN lv := 5;
    WHEN wins >= 15 THEN lv := 4;
    WHEN wins >= 8 THEN lv := 3;
    WHEN wins >= 3 THEN lv := 2;
    ELSE lv := 1;
  END CASE;
  RETURN lv;
END;
$$;

-- ============================================================
-- 4. 來賓禮（可選；INSERT 觸發器亦會保底 apc_balance）
-- ============================================================
CREATE OR REPLACE FUNCTION public.award_signup_bonus(user_uuid UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
BEGIN
  IF auth.uid() IS DISTINCT FROM user_uuid THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT apc_balance INTO current_balance FROM public.user_profiles WHERE id = user_uuid;

  IF current_balance IS NULL OR current_balance < 1000 THEN
    UPDATE public.user_profiles
    SET
      apc_balance = 1000,
      level = 1,
      total_wins = 0,
      total_losses = 0,
      last_sign_in_at = COALESCE(last_sign_in_at, now())
    WHERE id = user_uuid;

    IF NOT FOUND THEN
      INSERT INTO public.user_profiles (id, apc_balance, level, total_wins, total_losses, last_sign_in_at)
      VALUES (user_uuid, 1000, 1, 0, 0, now());
    END IF;
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.award_signup_bonus(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_signup_bonus(uuid) TO authenticated;

-- ============================================================
-- 5. 每日簽到 +50 APC（與無參數 RPC 相容，供前端 rpc('award_daily_login_points')）
-- 覆寫 supabase/user_profiles.sql 內舊版（改為 APC + 行事曆日判斷）
-- ============================================================
DROP FUNCTION IF EXISTS public.award_daily_login_points(uuid);

CREATE OR REPLACE FUNCTION public.award_daily_login_points()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  gained INTEGER := 0;
  last_date DATE;
  today DATE := (timezone('utc', now()))::date;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT (timezone('utc', last_sign_in_at))::date
  INTO last_date
  FROM public.user_profiles
  WHERE id = auth.uid();

  IF last_date IS NULL OR last_date < today THEN
    UPDATE public.user_profiles
    SET
      apc_balance = apc_balance + 50,
      last_sign_in_at = now()
    WHERE id = auth.uid();
    gained := 50;
  END IF;

  RETURN gained;
END;
$$;

REVOKE ALL ON FUNCTION public.award_daily_login_points() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.award_daily_login_points() TO authenticated;

-- ============================================================
-- 6. 結算戰鬥：winner + finished + 雙方勝敗與 APC
-- ============================================================
CREATE OR REPLACE FUNCTION public.settle_battle(p_battle_id UUID, p_winner TEXT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  battle_row public.battles%ROWTYPE;
  winner_id UUID;
  loser_id UUID;
BEGIN
  IF p_winner NOT IN ('fighter_a', 'fighter_b') THEN
    RAISE EXCEPTION 'Invalid winner';
  END IF;

  SELECT * INTO battle_row FROM public.battles WHERE id = p_battle_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Battle not found';
  END IF;

  UPDATE public.battles
  SET winner = p_winner, status = 'finished', updated_at = now()
  WHERE id = p_battle_id;

  IF p_winner = 'fighter_a' THEN
    winner_id := battle_row.fighter_a_user_id;
    loser_id := battle_row.fighter_b_user_id;
  ELSE
    winner_id := battle_row.fighter_b_user_id;
    loser_id := battle_row.fighter_a_user_id;
  END IF;

  UPDATE public.user_profiles
  SET
    total_wins = total_wins + 1,
    apc_balance = apc_balance + 140,
    level = public.calculate_user_level(total_wins + 1)
  WHERE id = winner_id;

  UPDATE public.user_profiles
  SET
    total_losses = total_losses + 1,
    level = public.calculate_user_level(total_wins)
  WHERE id = loser_id;
END;
$$;

REVOKE ALL ON FUNCTION public.settle_battle(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_battle(uuid, text) TO service_role;

-- ============================================================
-- 7. 扣挑戰費（僅本人）
-- ============================================================
CREATE OR REPLACE FUNCTION public.deduct_challenge_fee(user_uuid UUID, fee INTEGER DEFAULT 200)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_balance INTEGER;
  admin_flag BOOLEAN;
BEGIN
  IF auth.uid() IS DISTINCT FROM user_uuid THEN
    RAISE EXCEPTION 'Not allowed';
  END IF;

  SELECT COALESCE(is_admin, false), apc_balance
  INTO admin_flag, current_balance
  FROM public.user_profiles
  WHERE id = user_uuid;

  IF admin_flag THEN
    RETURN TRUE;
  END IF;

  IF current_balance IS NULL OR current_balance < fee THEN
    RETURN FALSE;
  END IF;

  UPDATE public.user_profiles SET apc_balance = apc_balance - fee WHERE id = user_uuid;
  RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.deduct_challenge_fee(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.deduct_challenge_fee(uuid, integer) TO authenticated;

-- ============================================================
-- 8. 新建 user_profiles 列時保底 apc_balance（與 aipo_coins 觸發器並存）
-- ============================================================
CREATE OR REPLACE FUNCTION public.on_user_profile_apc_default()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.apc_balance IS NULL OR NEW.apc_balance < 1000 THEN
    NEW.apc_balance := 1000;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_award_signup_bonus ON public.user_profiles;
CREATE TRIGGER trigger_award_signup_bonus
  BEFORE INSERT ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.on_user_profile_apc_default();

-- ============================================================
-- 9. 等級名稱（JSON）
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_level_info(lv INTEGER)
RETURNS JSONB
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
BEGIN
  RETURN CASE lv
    WHEN 1 THEN '{"name_cn": "訊號啟動者", "name_en": "Signal Starter"}'::JSONB
    WHEN 2 THEN '{"name_cn": "旋律達人", "name_en": "Melody Crafter"}'::JSONB
    WHEN 3 THEN '{"name_cn": "詞曲鬼匠", "name_en": "Lyric Ghost"}'::JSONB
    WHEN 4 THEN '{"name_cn": "節奏動感領航員", "name_en": "Rhythm Pilot"}'::JSONB
    WHEN 5 THEN '{"name_cn": "聲學哲學家", "name_en": "Acoustic Philosopher"}'::JSONB
    WHEN 6 THEN '{"name_cn": "靈性薩滿法老王", "name_en": "Spirit Pharaoh"}'::JSONB
    WHEN 7 THEN '{"name_cn": "交響樂之教皇", "name_en": "Symphony Pope"}'::JSONB
    WHEN 8 THEN '{"name_cn": "百大 DJ 泰坦", "name_en": "Top 100 Titan"}'::JSONB
    WHEN 9 THEN '{"name_cn": "優美旋律之王", "name_en": "Melody Monarch"}'::JSONB
    WHEN 10 THEN '{"name_cn": "音純大師", "name_en": "Pure Sound Master"}'::JSONB
    ELSE '{"name_cn": "未知", "name_en": "Unknown"}'::JSONB
  END CASE;
END;
$$;

REVOKE ALL ON FUNCTION public.get_level_info(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_level_info(integer) TO authenticated;
