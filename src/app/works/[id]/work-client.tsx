"use client";
import HomeWorkFeedback from "@/components/home-work-feedback";
import WorkImage from "@/components/work-image";
import { musicPlayer, useMusicPlayer } from "@/lib/music-player-store";
import { useI18n } from "@/lib/i18n";
import { homeCopy } from "@/lib/home-copy";
import type { HomeWork } from "@/lib/home-discovery";
import type { ExternalMusic } from "@/lib/external-music";
import ShareButton from "@/components/share-button";
import { workPath } from "@/lib/public-seo";

function WorkAudio({ work }: { work: HomeWork }) {
  const { lang } = useI18n(); const copy = homeCopy(lang); const player = useMusicPlayer();
  const selected = player.session?.queue[player.session.index]?.heartTrackId === work.id;
  return <div className="space-y-4"><div className="mx-auto aspect-square max-w-sm overflow-hidden rounded-lg"><WorkImage work={work} /></div>
    <button className="min-h-12 rounded-full bg-orange-400 px-6 py-3 font-bold text-black" onClick={() => {
      if (selected) musicPlayer?.toggle();
      else void musicPlayer?.start([{ ...work, heartTrackId: work.id }], 0, work.title, { sourceKey: `work:${work.id}` });
    }}>{selected && player.playing ? copy.pause : copy.play}</button>
  </div>;
}
export default function WorkClient({ work, externalMedia }: { work: HomeWork; externalMedia: ExternalMusic | null }) {
  const { lang } = useI18n(); const path = workPath(work.id, lang);
  const share = <ShareButton title={`${work.title} — ${work.artist}`} text={work.description || work.title} url={path} />;
  const note = { zh: "喜歡就送愛心收藏，也可以留下你的評價。", en: "Save a favorite and share your review.", ja: "気に入ったら保存して、感想も聞かせてください。", ko: "마음에 들면 저장하고 감상도 남겨 주세요." }[lang];
  return <HomeWorkFeedback inline work={work} showVideo={Boolean(work.videoId)}
    externalMedia={work.videoId ? undefined : externalMedia} mediaContent={!work.videoId && !externalMedia ? <WorkAudio work={work} /> : undefined}
    shareControl={share} supportNote={note} returnPath={path} onClose={() => {}} onChange={() => {}} />;
}
