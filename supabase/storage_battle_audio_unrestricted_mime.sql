-- ============================================================
-- battle-audio：取消 MIME 白名單（與 Dashboard「不限制檔案類型」等效）
-- ------------------------------------------------------------
-- 若已執行 storage_battle_audio.sql 仍因 MIME 被拒，可在 SQL Editor 執行本檔。
-- 注意：放寬後請仍依 RLS 與檔案大小上限控管。
-- ============================================================

update storage.buckets
set allowed_mime_types = null
where id = 'battle-audio';
