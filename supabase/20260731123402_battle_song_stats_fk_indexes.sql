-- Cover the nullable latest-battle foreign key used by song-level battle stats.

create index if not exists battle_song_stats_latest_battle_id_idx
on public.battle_song_stats (latest_battle_id)
where latest_battle_id is not null;
