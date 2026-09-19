import type { Metadata } from "next";
import type { ReactNode } from "react";
import { siteOrigin } from "@/lib/battle-og";

type Props = {
  children: ReactNode;
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { id } = await params;
  const canonical = `${siteOrigin()}/battle/q-crash/${encodeURIComponent(id)}`;
  const title = "Q Crash｜AIPOGER 非同步 Full Song Battle";
  const description = "這兩首歌到底哪首比較好聽啊？我有點選不出來！進來聽完整歌曲，幫我決定哪首勝出！";
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, type: "website", url: canonical },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default function QCrashCardLayout({ children }: Props) {
  return children;
}
