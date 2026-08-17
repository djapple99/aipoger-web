import type { Metadata } from "next";
import QCrashCardClient from "@/components/q-crash-card-client";
import { siteOrigin } from "@/lib/battle-og";
import { qCrashDisplayLang } from "@/lib/q-crash-rules";

type QCrashCardPageProps = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params, searchParams }: QCrashCardPageProps): Promise<Metadata> {
  const { id } = await params;
  const query = (await searchParams) ?? {};
  const rawLang = Array.isArray(query.lang) ? query.lang[0] : query.lang;
  const isZh = qCrashDisplayLang(rawLang) === "zh";
  const canonical = `${siteOrigin()}/battle/q-crash/${encodeURIComponent(id)}`;
  const title = isZh ? "Q Crash｜AIPOGER 非同步 Drop Battle" : "Q Crash | AIPOGER Async Drop Battle";
  const description = isZh
    ? "這兩首歌到底哪首比較好聽啊？我有點選不出來！兩首 60 秒 Drop，進來聽重點，幫我決定哪首勝出！"
    : "Which song sounds better? I can't decide! Two 60-second Drops—listen to the key moments and help me pick a winner.";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function QCrashCardPage({ params }: QCrashCardPageProps) {
  const { id } = await params;
  return <QCrashCardClient identifier={id} />;
}
