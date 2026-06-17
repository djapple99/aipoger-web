-- AIPOGER Bar Heartbreak audio upload policy refresh.
-- Safe to re-run in Supabase SQL Editor.
--
-- Product rule:
-- Bar Heartbreak accepts common compressed formats plus WAV/AIFF masters.
-- WAV files can be large, so this raises the bucket to a practical 100MB limit.
-- Supabase Storage global file size limit must also be greater than this bucket
-- limit; production was set to 201MB because battle-audio is already 200MB.

update storage.buckets
set
  file_size_limit = 104857600,
  allowed_mime_types = array[
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
    'audio/x-wav',
    'audio/wave',
    'audio/vnd.wave',
    'audio/aiff',
    'audio/x-aiff',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
    'audio/ogg'
  ]::text[]
where id = 'listen-bar-audio';
