-- AIPOGER 24H Daily Battle upload size fix
-- Run in Supabase SQL Editor (safe to re-run).
-- Raises battle-audio bucket max object size from 50MB to 200MB.

update storage.buckets
set file_size_limit = 209715200
where id = 'battle-audio';

-- Optional quick check
select id, file_size_limit
from storage.buckets
where id = 'battle-audio';
