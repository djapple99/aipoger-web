-- ============================================================
-- 測試擂臺：create_test_arena_battle（Security definer，繞過 battles INSERT RLS）
-- ------------------------------------------------------------
-- 1) 在 SQL Editor 執行（可重複執行）
-- 2) 需至少兩位 auth.users（B 會自動選另一位使用者作為 fighter_b）
-- 3) 若尚未有 started_at / song_a_cover 欄位，會 ALTER 補上
-- ============================================================

ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS song_a_cover TEXT;

ALTER TABLE public.battles ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

CREATE OR REPLACE FUNCTION public.create_test_arena_battle(
  p_fighter_a_name text,
  p_song_a_name text,
  p_audio_a_path text,
  p_genre text,
  p_ai_tool_a text DEFAULT NULL,
  p_cover_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  opp uuid;
  qa uuid;
  qb uuid;
  bid uuid;
  audio_b text := '__test__/opponent-placeholder.wav';
BEGIN
  IF uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  IF trim(coalesce(p_audio_a_path, '')) = '' THEN
    RAISE EXCEPTION 'p_audio_a_path required';
  END IF;

  SELECT au.id INTO opp
  FROM auth.users au
  WHERE au.id <> uid
  ORDER BY au.created_at ASC
  LIMIT 1;

  IF opp IS NULL THEN
    RAISE EXCEPTION 'Need at least two registered users to create a test battle (fighter B).';
  END IF;

  INSERT INTO public.battle_queue (
    user_id, fighter_name, genre, audio_path, original_file_name, ai_tool, status
  )
  VALUES (
    uid,
    coalesce(nullif(trim(p_fighter_a_name), ''), '鬥士 A'),
    coalesce(nullif(trim(p_genre), ''), '未指定'),
    trim(p_audio_a_path),
    coalesce(nullif(trim(p_song_a_name), ''), 'Track A'),
    nullif(trim(p_ai_tool_a), ''),
    'cancelled'
  )
  RETURNING id INTO qa;

  INSERT INTO public.battle_queue (
    user_id, fighter_name, genre, audio_path, original_file_name, ai_tool, status
  )
  VALUES (
    opp,
    '測試對手',
    coalesce(nullif(trim(p_genre), ''), '未指定'),
    audio_b,
    'Track B (test)',
    NULL,
    'cancelled'
  )
  RETURNING id INTO qb;

  INSERT INTO public.battles (
    queue_a_id,
    queue_b_id,
    fighter_a_user_id,
    fighter_b_user_id,
    fighter_a_name,
    fighter_b_name,
    song_a_name,
    song_b_name,
    audio_a_path,
    audio_b_path,
    genre,
    status,
    ai_tool_a,
    ai_tool_b,
    song_a_cover,
    started_at
  )
  VALUES (
    qa,
    qb,
    uid,
    opp,
    coalesce(nullif(trim(p_fighter_a_name), ''), '鬥士 A'),
    '測試對手',
    coalesce(nullif(trim(p_song_a_name), ''), 'Track A'),
    '—',
    trim(p_audio_a_path),
    audio_b,
    coalesce(nullif(trim(p_genre), ''), '未指定'),
    'live',
    nullif(trim(p_ai_tool_a), ''),
    NULL,
    nullif(trim(p_cover_url), ''),
    now()
  )
  RETURNING id INTO bid;

  IF p_cover_url IS NOT NULL AND trim(p_cover_url) <> '' THEN
    INSERT INTO public.fighter_profiles (id, song_cover_url)
    VALUES (uid, trim(p_cover_url))
    ON CONFLICT (id) DO UPDATE SET
      song_cover_url = excluded.song_cover_url,
      updated_at = now();
  END IF;

  RETURN bid;
END;
$$;

REVOKE ALL ON FUNCTION public.create_test_arena_battle(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_test_arena_battle(text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.create_test_arena_battle IS 'Skip matchmaking: create live battle row for solo test (needs 2+ auth users).';
