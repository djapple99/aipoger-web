type NewMusicBadgeProps = {
  lang: string;
  className?: string;
};

function badgeTitle(lang: string) {
  if (lang === "ja") return "公開から7日以内";
  if (lang === "ko") return "공개 후 7일 이내";
  if (lang === "en") return "Published within 7 days";
  return "上架 7 天內";
}

export default function NewMusicBadge({ lang, className = "" }: NewMusicBadgeProps) {
  const title = badgeTitle(lang);
  return (
    <span
      className={`pointer-events-none inline-flex min-h-5 items-center rounded-sm border border-yellow-100/75 bg-yellow-300 px-1.5 py-0.5 text-[9px] font-black leading-none tracking-[0.14em] text-black shadow-[0_0_18px_rgba(253,224,71,0.32)] ${className}`}
      aria-label={title}
      title={title}
    >
      NEW
    </span>
  );
}
