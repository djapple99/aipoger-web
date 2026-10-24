import { headers } from "next/headers";
import { ANALYSIS_COPY } from "@/lib/music-analysis-tools";
import { publicLang, publicMetadata } from "@/lib/public-seo";
export async function generateMetadata() {
  const lang = publicLang((await headers()).get("x-aipoger-lang")); const copy = ANALYSIS_COPY[lang];
  return publicMetadata({ path: "/music-analysis", lang, title: `${copy.title}｜AIPOGER`, description: copy.intro });
}
export default function AnalysisLayout({ children }: { children: React.ReactNode }) { return children; }
