-- Allow 24H Daily Battle upload formats in bucket `battle-audio`.
-- Run in Supabase SQL Editor (safe to re-run).

update storage.buckets
set allowed_mime_types = array[
  'audio/mpeg',
  'audio/mp4',
  'audio/x-m4a',
  'audio/ogg',
  'audio/webm',
  'audio/wav',
  'audio/x-wav',
  'audio/wave',
  'audio/vnd.wave',
  'audio/aiff',
  'audio/x-aiff',
  'audio/aac',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif'
]
where id = 'battle-audio';
