import "server-only";
import { headers } from "next/headers";
import { isSupportedLang } from "@/lib/locale";
import { publicLang } from "@/lib/public-seo";
export async function requestLang(value?: unknown) {
  return publicLang(typeof value === "string" && isSupportedLang(value) ? value : (await headers()).get("x-aipoger-lang"));
}
