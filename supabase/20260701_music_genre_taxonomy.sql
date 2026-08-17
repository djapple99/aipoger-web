-- AIPOGER music genre taxonomy update.
-- Purpose: migrate old fixed genre labels into the 2026-07-01 scene-based taxonomy.
-- Safe to run repeatedly; rows already using new labels are ignored.

create or replace function public.aipoger_migrate_music_genre_labels()
returns table(table_name text, updated_rows integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_table text;
  changed integer;
begin
  foreach target_table in array array[
    'listen_bar_tracks',
    'battle_queue',
    'battles',
    'battle_song_stats',
    'daily_battle_entries',
    'official_gatekeeper_drops'
  ]
  loop
    if to_regclass('public.' || target_table) is null then
      table_name := target_table;
      updated_rows := 0;
      return next;
      continue;
    end if;

    execute format(
      $sql$
      update public.%I
      set genre = case genre
        when 'K-pop動感風' then 'K-Pop 韓式動感'
        when 'K-pop 動感風' then 'K-Pop 韓式動感'
        when 'K-Pop動感風' then 'K-Pop 韓式動感'
        when '說唱街頭風' then 'Rap 街頭說唱'
        when '復古City-Pop' then 'Disco / Funk / City-Pop'
        when '復古 City-Pop' then 'Disco / Funk / City-Pop'
        when 'City Pop / Disco / Funk 城市律動' then 'Disco / Funk / City-Pop'
        when '感人抒情' then 'R&B 深情瞬間'
        when '熱血搖滾' then 'Band Rock 熱血搖滾'
        when '動感電音' then 'EDM 百大電音'
        when '心靈 Ambient 宇宙' then 'Spiritual / Ambient 放鬆宇宙'
        when '台語熊 High' then 'Original 自我風格'
        when '自我風格' then 'Original 自我風格'
        when 'Custom Style' then 'Original 自我風格'
        when 'AI Music' then 'Original 自我風格'
        when 'Pop' then 'Original 自我風格'
        when 'Electronic;Pop;Non-Music;Brit Pop;Disco;Downtempo;Eurodance;House;Trip Hop;Chillout;Easy Listening;Pop Rock;Soft Rock;Spoken Word;Singer-Songwriter' then 'EDM 百大電音'
        else genre
      end
      where genre in (
        'K-pop動感風',
        'K-pop 動感風',
        'K-Pop動感風',
        '說唱街頭風',
        '復古City-Pop',
        '復古 City-Pop',
        'City Pop / Disco / Funk 城市律動',
        '感人抒情',
        '熱血搖滾',
        '動感電音',
        '心靈 Ambient 宇宙',
        '台語熊 High',
        '自我風格',
        'Custom Style',
        'AI Music',
        'Pop',
        'Electronic;Pop;Non-Music;Brit Pop;Disco;Downtempo;Eurodance;House;Trip Hop;Chillout;Easy Listening;Pop Rock;Soft Rock;Spoken Word;Singer-Songwriter'
      )
      $sql$,
      target_table
    );

    get diagnostics changed = row_count;
    table_name := target_table;
    updated_rows := changed;
    return next;
  end loop;
end;
$$;

revoke all on function public.aipoger_migrate_music_genre_labels() from public;
grant execute on function public.aipoger_migrate_music_genre_labels() to service_role;

comment on function public.aipoger_migrate_music_genre_labels() is
'Migrates old AIPOGER genre labels into the 2026-07-01 scene-based taxonomy across known genre-bearing tables.';

select * from public.aipoger_migrate_music_genre_labels();
