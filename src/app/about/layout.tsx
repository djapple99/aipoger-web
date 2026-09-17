import type { Metadata } from "next";
import { headers } from "next/headers";
import SeoJsonLd from "@/components/seo-json-ld";
import { htmlLangFor, isSupportedLang } from "@/lib/locale";

const aboutCopy = {
  zh: {
    title: "關於 AIPOGER 愛播歌",
    description: "認識 AIPOGER AI 音樂社群：探索作品、傷心酒吧公播、Drop Battle，以及 Showtime 月排行榜與創作者的 Choice 推薦歌單。",
  },
  en: {
    title: "About AIPOGER",
    description: "Meet the AIPOGER AI music community: discover tracks, listen to Bar Heartbreak, join Drop Battles, and explore Showtime monthly charts and creator Choice playlists.",
  },
  ja: {
    title: "AIPOGERについて",
    description: "AI音楽コミュニティAIPOGER。作品の発見、Bar Heartbreakの公開再生、Drop Battle、Showtimeの月間チャートとクリエイターのChoiceプレイリスト。",
  },
  ko: {
    title: "AIPOGER 소개",
    description: "AI 음악 커뮤니티 AIPOGER: 작품 탐색, Bar Heartbreak 공개 재생, Drop Battle, Showtime 월간 차트와 크리에이터의 Choice 플레이리스트를 만나보세요.",
  },
};

async function readAboutCopy() {
  const requested = (await headers()).get("x-aipoger-lang");
  const lang = isSupportedLang(requested) ? requested : "zh";
  return { lang, ...aboutCopy[lang] };
}

export async function generateMetadata(): Promise<Metadata> {
  const copy = await readAboutCopy();
  return {
    title: copy.title,
    description: copy.description,
    alternates: {
      languages: {
        "zh-Hant": "/about?lang=zh",
        en: "/about?lang=en",
        ja: "/about?lang=ja",
        ko: "/about?lang=ko",
      },
    },
  };
}

export default async function AboutLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const copy = await readAboutCopy();
  return (
    <>
      <SeoJsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "AboutPage",
          name: copy.title,
          description: copy.description,
          url: `https://aipoger.com/about?lang=${copy.lang}`,
          inLanguage: htmlLangFor(copy.lang),
          mainEntity: { "@id": "https://aipoger.com/#organization" },
        }}
      />
      {children}
    </>
  );
}
