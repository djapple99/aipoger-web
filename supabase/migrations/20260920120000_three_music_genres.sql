-- Add three genres without rewriting tracks, frozen chart entries, votes or ranks.
begin;
select pg_advisory_xact_lock(724193, 1);

create or replace function public.monthly_chart_canonical_genre(p_value text)
returns text language sql immutable set search_path = '' as $$
  with cleaned as (
    -- Match JavaScript String.trim() in src/lib/music-genres.ts.
    select btrim(coalesce(p_value, ''),
      U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF') as value
  ), aliases(canonical, alternatives) as (
    values
      ('K-Pop 韓式動感', array['k-pop動感風', 'k-pop 動感風', 'kpop 韓式動感']),
      ('Rap 街頭說唱', array['說唱街頭風']),
      ('Disco / Funk / City-Pop', array['復古city-pop', '復古 city-pop', 'city pop / disco / funk 城市律動']),
      ('R&B 深情瞬間', array['感人抒情']),
      ('Band Rock 熱血搖滾', array['熱血搖滾']),
      ('EDM 百大電音', array['動感電音']),
      ('Jazz / Bossa 微醺時刻', array[]::text[]),
      ('Spiritual / Ambient 放鬆宇宙', array['心靈 ambient 宇宙', 'spiritual ambient universe']),
      ('Chinese Fusion 新派古風', array[]::text[]),
      ('台語熊high', array['台語熊 high', 'taiwanese bear high']),
      ('Original 自我風格', array['自我風格', 'custom style', 'ai music', 'pop']),
      ('Children''s Music 兒歌', array[]::text[]),
      ('Latin / Reggae 拉丁雷鬼', array[]::text[]),
      ('Cinematic 電影配樂', array[]::text[])
  )
  select coalesce((select canonical from aliases
    where lower(cleaned.value) = lower(canonical) or lower(cleaned.value) = any(alternatives)),
    nullif(cleaned.value, ''), 'Original 自我風格') from cleaned;
$$;

create or replace function public.monthly_chart_valid_genre(p_value text)
returns boolean language sql immutable set search_path = '' as $$
  -- Canonicalization preserves the shared display fallback; eligibility still
  -- requires an explicitly supplied genre from the current fourteen-genre set.
  select nullif(btrim(coalesce(p_value, ''),
    U&'\0009\000A\000B\000C\000D\0020\00A0\1680\2000\2001\2002\2003\2004\2005\2006\2007\2008\2009\200A\2028\2029\202F\205F\3000\FEFF'), '') is not null
    and public.monthly_chart_canonical_genre(p_value) = any(array[
      'K-Pop 韓式動感', 'Rap 街頭說唱', 'Disco / Funk / City-Pop',
      'R&B 深情瞬間', 'Band Rock 熱血搖滾', 'EDM 百大電音',
      'Jazz / Bossa 微醺時刻', 'Spiritual / Ambient 放鬆宇宙',
      'Chinese Fusion 新派古風', '台語熊high', 'Original 自我風格',
      'Children''s Music 兒歌', 'Latin / Reggae 拉丁雷鬼', 'Cinematic 電影配樂'
    ]);
$$;

revoke all on function public.monthly_chart_canonical_genre(text) from public, anon, authenticated, service_role;
revoke all on function public.monthly_chart_valid_genre(text) from public, anon, authenticated, service_role;
commit;
