import BattleGuide from "@/components/battle-guide";
import SeoJsonLd from "@/components/seo-json-ld";
import { battleGuideCopy } from "@/lib/battle-guide-copy";
import { publicMetadata, publicUrl } from "@/lib/public-seo";
import { requestLang } from "@/lib/server-public-locale";
type Props = { searchParams: Promise<{ lang?: string }> };
export async function generateMetadata({ searchParams }: Props) {
  const lang = await requestLang((await searchParams).lang); const c = battleGuideCopy(lang);
  return publicMetadata({ path: "/drop-guide", lang, title: `${c.nav} | AIPOGER`, description: c.intro, type: "article" });
}
export default async function BattleGuidePage({ searchParams }: Props) {
  const lang = await requestLang((await searchParams).lang); const c = battleGuideCopy(lang);
  return <><BattleGuide lang={lang} /><SeoJsonLd data={{ "@context": "https://schema.org", "@type": "TechArticle", headline: c.nav, description: c.intro, url: publicUrl("/drop-guide", lang), inLanguage: lang === "zh" ? "zh-Hant" : lang, dateModified: "2026-10-25", publisher: { "@type": "Organization", name: "AIPOGER", url: "https://aipoger.com" } }} /></>;
}
