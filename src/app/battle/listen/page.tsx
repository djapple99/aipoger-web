import type { Metadata } from "next";
import BlindListeningRoom from "@/components/blind-listening-room";
import { headers } from "next/headers";
import { isSupportedLang } from "@/lib/locale";
import { battleRetroCopy } from "@/lib/battle-retro-copy";
export async function generateMetadata(): Promise<Metadata> {
  const requested = (await headers()).get("x-aipoger-lang");
  const c = battleRetroCopy(isSupportedLang(requested) ? requested : "zh");
  return { title: { absolute: c.blind + "｜AIPOGER" }, description: c.blindDescription + " " + c.rewardNote };
}
export default function BlindListeningPage() { return <BlindListeningRoom/>; }
