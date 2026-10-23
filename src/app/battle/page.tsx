import type { Metadata } from "next";
import { headers } from "next/headers";
import BattlePage from "./battle-client";
import { battleModeMetadata, isBattleMode } from "@/lib/battle-mode-sharing";
import { isSupportedLang } from "@/lib/locale";

export async function generateMetadata({ searchParams }: {
  searchParams: Promise<{ lang?: string | string[]; mode?: string | string[] }>;
}): Promise<Metadata> {
  const query = await searchParams;
  const requested = query.lang ?? (await headers()).get("x-aipoger-lang");
  const lang = typeof requested === "string" && isSupportedLang(requested) ? requested : "zh";
  return battleModeMetadata(isBattleMode(query.mode) ? query.mode : null, lang);
}

export default BattlePage;
