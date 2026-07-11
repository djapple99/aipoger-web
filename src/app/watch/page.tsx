import { redirect } from "next/navigation";

export default async function WatchPage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const params = await searchParams;
  const lang = ["zh", "en", "ja", "ko"].includes(params.lang ?? "") ? params.lang : "zh";
  redirect(`/battle?lang=${lang}`);
}
