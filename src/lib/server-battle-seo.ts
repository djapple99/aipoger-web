import "server-only";
import { publicMetadata, publicUrl } from "@/lib/public-seo";
import type { Lang } from "@/lib/locale";
import type { PublicBattleSummary } from "@/lib/server-public-battles";
export function publicBattleMetadata(battle: PublicBattleSummary, requested: Lang, path = `/battle/${battle.id}`) {
  const q = battle.battle_type === "q_crash";
  const lang = q && requested !== "zh" ? "en" : requested;
  const pair = `${battle.song_a_name}${battle.song_b_name ? ` VS ${battle.song_b_name}` : ""}`;
  const title = `${q ? "Q Crash" : "Drop Battle"}｜${pair}｜AIPOGER`;
  const description = `${battle.fighter_a_name}${battle.fighter_b_name ? ` · ${battle.fighter_b_name}` : ""}｜${pair}${battle.genre ? `｜${battle.genre}` : ""}`;
  const image = q ? "/images/battle-share/q-crash.png" : `/battle/${battle.id}/opengraph-image`;
  const metadata = publicMetadata({ path, lang, title, description, image: { url: image, width: 1200, height: 630, alt: title } });
  if (q) metadata.alternates = { canonical: publicUrl(path, lang), languages: { "zh-Hant": publicUrl(path, "zh"), en: publicUrl(path, "en"), "x-default": publicUrl(path, "zh") } };
  return metadata;
}
