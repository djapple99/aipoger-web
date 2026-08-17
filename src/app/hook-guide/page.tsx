import { redirect } from "next/navigation";

export default async function HookGuidePage({
  searchParams,
}: {
  searchParams: Promise<{ lang?: string }>;
}) {
  const { lang } = await searchParams;
  const suffix = lang ? `?lang=${encodeURIComponent(lang)}` : "";
  redirect(`/drop-guide${suffix}`);
}
