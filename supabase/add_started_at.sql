-- ============================================================
-- battles：新增 started_at（在 Supabase SQL Editor 執行，可重複執行）
-- ============================================================

ALTER TABLE public.battles
  ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;

-- 既有列：以 created_at 回填（若你希望代表「開打時間」）
UPDATE public.battles
SET started_at = created_at
WHERE started_at IS NULL;

ALTER TABLE public.battles
  ALTER COLUMN started_at SET DEFAULT now();

COMMENT ON COLUMN public.battles.started_at IS 'Battle start time (display / sorting; defaults to now on insert)';
