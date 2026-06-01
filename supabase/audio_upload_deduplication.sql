-- AIPOGER audio upload deduplication
-- 在 Supabase SQL Editor 執行。可重複執行。
--
-- 目的：
-- 1. 用音檔內容 SHA-256 指紋辨識同一首檔案，不靠歌名。
-- 2. 傷心酒吧 active 歌曲不可重複。
-- 3. 24H Daily Battle / 90s Hook active queue 不可重複使用同一個音檔。

alter table public.listen_bar_tracks
  add column if not exists audio_sha256 text;

alter table public.daily_battle_entries
  add column if not exists audio_sha256 text;

alter table public.battle_queue
  add column if not exists audio_sha256 text;

alter table public.listen_bar_tracks
  drop constraint if exists listen_bar_tracks_audio_sha256_format;

alter table public.listen_bar_tracks
  add constraint listen_bar_tracks_audio_sha256_format
  check (audio_sha256 is null or audio_sha256 ~ '^[a-f0-9]{64}$');

alter table public.daily_battle_entries
  drop constraint if exists daily_battle_entries_audio_sha256_format;

alter table public.daily_battle_entries
  add constraint daily_battle_entries_audio_sha256_format
  check (audio_sha256 is null or audio_sha256 ~ '^[a-f0-9]{64}$');

alter table public.battle_queue
  drop constraint if exists battle_queue_audio_sha256_format;

alter table public.battle_queue
  add constraint battle_queue_audio_sha256_format
  check (audio_sha256 is null or audio_sha256 ~ '^[a-f0-9]{64}$');

-- Backfill hashes scanned from current Storage objects on 2026-05-26.
update public.listen_bar_tracks as t
set audio_sha256 = v.audio_sha256
from (values
  ('a8b9b0d9-e5dd-4cec-a6b6-1d42d586700d'::uuid, '25deb06f49b950408d79b02a6e04c36a7420dfdb687c8c9a8ab2d552d01d02bf'),
  ('006f0bc1-9417-4020-898d-e50c5524fa44'::uuid, '744f25a2f10e4bc96beea5badc644b035b6559cd08bd080dc475454fa1158606'),
  ('0506bc30-0047-45f6-a7e3-198e19ce7531'::uuid, '5fc2eefc89aa930cd05d5df42b802e1ef08d1bb807975c1d037243165d321ab4'),
  ('71d24c81-8293-4f90-8639-8f224bf4494e'::uuid, '7e513c0fd05bd403923a27786ff503cad8a814e0e41b2908b8a8465ad3963bbe'),
  ('b62138ad-6ddf-43fe-a024-8e57fc0abcbe'::uuid, '6709e5e75ce89dfc286c366995b162e4706d0d65231c13f44dadb72d239c47d3'),
  ('dbde4b10-6b0e-4745-9393-0f6f155a0f90'::uuid, 'dc221776d63b4f4f8abc8386abb362909d9367a98e3ad524837dd47de8aecbe3'),
  ('0a1654db-ec7c-42f0-9c64-b8043ff5df3f'::uuid, '651d91c58747431dc2bb0b809911c34af7428fff4f2d8e56e6c2409c88630a1a'),
  ('645a272e-37b6-4ae5-9151-3b99a2e2f9b3'::uuid, '0db87f7401ee52d750df9f43b112e4fca9b746fef95ccdda884c3a993dd3c941'),
  ('4ab1448d-e9e2-4ec4-b0cf-34e3b4ea783a'::uuid, 'a0abd3d2d7dc2a5fdc91803bacb5988979483752b1339f5ed00a31085c2d582c'),
  ('43e4f64d-8be2-4292-961c-c8be80ce7be5'::uuid, '1b221ad8a232673c8638307dd15e3d3efed2da3966c96e6800266597ca3f55f3'),
  ('a1643e40-01a0-4d80-af1e-cc8d8576dcb2'::uuid, '5c2c3d2d44647fcf184c591dbe135c13a4728073e3fc0d6ac6394ee8f0be00a5'),
  ('2089dec5-9319-4c82-80b0-e682120266a1'::uuid, 'a4025a0274abbb0633512ae57c70453b3c2507e60b9c91a13b93884ad1921db1'),
  ('f470c182-252f-49c0-891d-62fbe5cbaa13'::uuid, '087b9416f4813e531e8ff364190c0408af14be07beae7d2e2f13a1a660c41063'),
  ('d2cf4502-8a25-400d-a977-c450519c9d98'::uuid, '070b39965c79d926ab2aafa8d0a4b9e1ed38ce99036f0ab2dd3e5016b18198a1'),
  ('65dc3d41-0c3f-4f55-b6b1-f3f6ea7adbf1'::uuid, '96325839c8a69b9ceeff05d7bb1d71d507e7e3bbd323a4da3dfa6005a6984648'),
  ('463ac097-3845-4469-b6a5-684de8e54488'::uuid, '42cf926aeb4f44caba6f24a0d386846116f846b447508aadee519300ba1440b8'),
  ('253e8009-1242-4fab-aa9b-945d26b7c292'::uuid, '318f7fe23b1688c14d43f88a7f20dfedaa2d570afd58a1d029ea68e1fcc1d105'),
  ('ecd35b99-e748-4ef6-ba0d-aa37315c52ba'::uuid, '89a1e28b25f90417d3caff359e47bef8bf2329b9b1985aa87ea422cdb41f2257'),
  ('97ea7aa5-db2b-4483-8bd4-8f9da848eefc'::uuid, '5d5e9d2e072a940d436b1ef25b995acbb63f9f3bd3f57ec9f3992a550a09ffdf'),
  ('11d5534a-d7f2-4db8-af18-6498146b0c3f'::uuid, '07fd17fbafa45bddb4836212576de6876cfd9a4f367ee425964ad70c52238356'),
  ('65826e11-7ad2-4302-a23f-14cc6cca665b'::uuid, '2ec06fd1cd624d963c645740cc290093c6a9e60d27bf30743447be4bde9e53cc'),
  ('3669b68c-cdff-499a-b736-4b0b19707373'::uuid, 'cd3ab22ba5cc5cded6ec4467590998bf93f435107d3ad042d38f52855c4082d5'),
  ('d42ce673-f974-4035-899b-3b4f3f1fa904'::uuid, '39df24201339e4642db12cffadd4dcaa475bee695926b071542e1c85cd91176e'),
  ('8e093698-48f3-4834-9ea9-93a4e6ab9139'::uuid, '76dd2d741b620fd49e06412098bec8c1183ca35ba17766667d34fe6a4336aa05'),
  ('62303113-8460-4a48-a25b-ddb35a48c606'::uuid, '13bfbfedba1427ff09bbdb8b4f73e978a16af377f44405d623a3282a92b1681a'),
  ('f295133e-8ec9-4c60-9057-5ae2f1c2b58e'::uuid, '732b16b797bee9dc0986e4dcf7c5be3391d98218797220a570d77c534306b889'),
  ('bea1a490-13e3-4e77-a9b8-27e904aa860b'::uuid, '6dd215b13b3e47075fef4395ad37567dc3159b276c3910dd437a03b43c6d3ab9'),
  ('08eec1d3-7a9f-4d83-9593-88d34b9b31d6'::uuid, '15cd0c0d0c08a6548af9b250e9092cef5713f56e6efaab68c866069008216222'),
  ('17332f63-8a71-4752-a833-e4616746a2d8'::uuid, 'b6520138de4964a6283df05344f43259fd72aa2b1b917129c2a2c7af9f97e46a'),
  ('28b8586f-021e-44d5-9d30-eff5ef0464e3'::uuid, '0dc35edf2055753d81f14b9dc69e72b26c5e8d144f381b9f23dc3242ad411125'),
  ('f7542015-1e7b-467d-9158-323d1566136c'::uuid, 'c1c29613bdf7f12d425c92ba1799957429ef25f67bab54f692e00f139a65775a'),
  ('431392fa-2c9f-4a61-94a4-bc69d9f1d4aa'::uuid, '565e5dba826a93550be2d9d53f8698cccdac446967a98c3995e8f1e562fa400f'),
  ('cdacf533-976a-4cb1-b7ec-58cf620c5683'::uuid, '97e5d4c91a3c29210a185c16e9776505deb0b78dc9f923e4efdb9e2de3c48b32'),
  ('0baf1e3e-a111-4b43-a9d7-a98c086e9a73'::uuid, 'a99e083d111c7ed82fb9a877cea465a97debdf112f35d7912b439b48d2b0e258'),
  ('768778c4-3a1f-4d26-bb06-586e8dfd72a8'::uuid, 'bbbf44e1a363e31f3fef504d5ca4a269538c51a114d999f922ed36df4a578066'),
  ('e1c570ed-b2f7-42d6-8455-64c91791ca36'::uuid, '3098e00e93784c17c289eeb0bd656972fadead69e9b20d12d035e0f94939ce66'),
  ('9421ac37-7dc0-4262-bada-a2021341d516'::uuid, '1361927b06ea409fca4d0939405e2e85ca208b77857191ccf9133e40546c2972'),
  ('b3385ca7-3e22-4002-a1df-c9e4acd5d2d7'::uuid, '876b98235a929cc8233486d4a8db7de7322bf93d6163497094d1f28814719ee7'),
  ('29628b45-abaa-4ee4-92eb-21783d768e01'::uuid, 'fc58e75d22d56320a03011f27587cf65cdc36d6dfe7f7d40a23ce6a542c749f5'),
  ('5a1eec2e-02c6-42f8-a164-9870ee2f9068'::uuid, '6b414e75a3668a123e670ce834499d50d5f8f9db48492ccb83b5530b455e03d2'),
  ('708c5231-5aff-46fc-8da3-3f7e13e3b2e9'::uuid, '7e5ebf5e74d43977513c1bbd46eb11ca4e518f4aa383733b0ad88f3eb8ceaeab'),
  ('636e5986-e967-4636-a1be-5fc6fc9eabc6'::uuid, 'da0066a295865e5e35a496c383b6e2f2ff173410d7e2f7e27cdfef633573998e'),
  ('576c76f2-d9ae-4978-8d6d-fabb0b0ca9d1'::uuid, 'e5f7702ffb896912552c92010091e10670932b23ed255e2ca001895ff94a835f'),
  ('4c9f1d81-ff1a-425b-bb9a-70337b0f7a3c'::uuid, '3dea88006e77c285893dc6f3ecb9c60cef24c2a0b1d58420f4c21ab29d849115'),
  ('8af455d1-8448-4317-97c8-d68214f1b5b1'::uuid, 'a11b2264240cabf15ad16343aaf29e73afef0b0dd4e74582c359c96005d761b4'),
  ('09579d88-587d-4681-a1a6-7afbd6458d78'::uuid, '0638f48e8e91a8654f15ebb65a22622dec829ca815df9a2fa2024ed87a75fcad'),
  ('17be5654-644d-4d2e-af66-2fe99532abca'::uuid, '830dd972cd6fd63c482d8533aae64f020a7ea9d609d686435cb1f9222f06a153'),
  ('3a4f0760-02bf-4065-b717-71f404f15cb7'::uuid, '93785c7ab0aa6573299b95e987ad7ba64f9c6c204f388f520aa30b4865433989'),
  ('3b7cc690-d62f-4d9f-b7c4-b7ca55619bba'::uuid, '2f397145f02c05547e3326903483901c31c00f1ff286ea904e63f5b8329ec1e6'),
  ('2812b547-9196-4cd3-bb53-394f0f4c471b'::uuid, '35942d648d999a5aa7a0d217e2b23f975ce7c7c6ee903d11253b4e7a46b049df'),
  ('484a0d6a-4cca-46cc-ac9a-b6500a2f87a1'::uuid, 'bc12b8934b5a7296810657d9d53a34722cbf3e6ba8b150b6c6826847ba7db894'),
  ('20c2184e-46ee-439b-9b50-114a4c95bb3e'::uuid, 'a0cfbf71437befb44bc9f22f999aceb095cd2959325e8fbaed888111e16b1a53'),
  ('9b146649-fae7-445c-aec7-c05328df6a49'::uuid, '0d020266a7601779ddec1f5f8f20a04cdbeb8fff2079950e022f3cee4763e687'),
  ('db062c01-a27f-4b35-9626-db901caadaa6'::uuid, '904d5c53ca5c4fb74f26bdce310abaecf116a2137581ed931a331474f360793d'),
  ('1e73273c-b368-44d0-8a93-6b1b842529ff'::uuid, 'cd8f22325a623e5ad20f4f73475205ffc4fb4253016d369177be704d53644a30'),
  ('dc3c7377-47da-4f5a-ac98-1b124401276c'::uuid, 'a5dc1cb4eea02216635c356a32c86ccec00d1c96e854db1aad3bdade0d1ca812'),
  ('39f1b9c6-1a66-4ebe-bfd2-870537abf7fc'::uuid, '9d6b4aa1a07e6bde10e865bef1d21d18ef4bdb00a1ebceeb03e2762c5d4b2c51')
) as v(id, audio_sha256)
where t.id = v.id
  and t.audio_sha256 is null;

update public.daily_battle_entries as t
set audio_sha256 = v.audio_sha256
from (values
  ('fc7a43de-9b8d-4fa3-a063-0050af705099'::uuid, '2d807ce05064e57dd92d214b3c030f5bfac4840df71934e66b640f2dd141c7df')
) as v(id, audio_sha256)
where t.id = v.id
  and t.audio_sha256 is null;

update public.battle_queue as t
set audio_sha256 = v.audio_sha256
from (values
  ('feb28394-e84a-4ff3-b77d-991d4d56eb33'::uuid, '9bb454d42de20559b86255254325c8a60f4a831578ee4825dac7f95b33bddf2e')
) as v(id, audio_sha256)
where t.id = v.id
  and t.audio_sha256 is null;

create unique index if not exists listen_bar_tracks_audio_sha256_active_uniq
on public.listen_bar_tracks (audio_sha256)
where audio_sha256 is not null
  and is_active = true;

create unique index if not exists daily_battle_entries_audio_sha256_active_uniq
on public.daily_battle_entries (audio_sha256)
where audio_sha256 is not null
  and status in ('queued', 'matched', 'live');

create unique index if not exists battle_queue_audio_sha256_active_uniq
on public.battle_queue (audio_sha256)
where audio_sha256 is not null
  and status in ('searching', 'waiting', 'waiting_challenge', 'matched', 'active', 'ghost_battle', 'public_voting');

select 'listen_bar_tracks' as table_name, count(*) as rows_with_hash
from public.listen_bar_tracks
where audio_sha256 is not null
union all
select 'daily_battle_entries', count(*)
from public.daily_battle_entries
where audio_sha256 is not null
union all
select 'battle_queue', count(*)
from public.battle_queue
where audio_sha256 is not null;
