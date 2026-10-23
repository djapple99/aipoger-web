import type { Metadata } from "next";
import BlindListeningRoom from "@/components/blind-listening-room";
import { headers } from "next/headers";
import { isSupportedLang } from "@/lib/locale";
import { battleModeMetadata } from "@/lib/battle-mode-sharing";
export async function generateMetadata(): Promise<Metadata> {
  const requested = (await headers()).get("x-aipoger-lang");
  return battleModeMetadata("blind", isSupportedLang(requested) ? requested : "zh", true);
}
export default function BlindListeningPage() { return <BlindListeningRoom/>; }
