"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useI18n } from "@/lib/i18n";

export default function WaitingRoomRedirectPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { lang } = useI18n();
  const queueId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    if (!queueId) return;
    router.replace(`/battle/${encodeURIComponent(queueId)}?lang=${lang}`);
  }, [lang, queueId, router]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050505] px-6 text-center text-zinc-200">
      <p className="text-sm font-black uppercase tracking-[0.26em] text-orange-100/80">
        Entering Drop Battle Arena...
      </p>
    </main>
  );
}
