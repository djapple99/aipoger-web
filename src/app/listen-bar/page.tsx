import { permanentRedirect } from "next/navigation";
import { requestLang } from "@/lib/server-public-locale";
export default async function ListenBarPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const input = await searchParams; const lang = await requestLang(typeof input.lang === "string" ? input.lang : undefined);
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(input)) if (typeof value === "string" && key !== "spotlight") params.set(key, value);
  params.set("lang", lang);
  if (params.get("submit") === "1") permanentRedirect(`/profile?${params.toString()}#submit-work`);
  permanentRedirect(`/ai-music?${params.toString()}`);
}
