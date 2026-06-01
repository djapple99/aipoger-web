"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect } from "react";

export default function WaitingRoomRedirectPage() {
  const params = useParams<{ id: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const battleId = Array.isArray(params.id) ? params.id[0] : params.id;

  useEffect(() => {
    const query = searchParams.toString();
    router.replace(`/battle/${encodeURIComponent(battleId)}${query ? `?${query}` : ""}`);
  }, [battleId, router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-white">
      <div>
        <p className="text-xs font-black uppercase tracking-[0.32em] text-orange-200/80">AIPOGER DROP BATTLE</p>
        <p className="mt-3 text-lg font-black">正在進入鬥歌場…</p>
      </div>
    </main>
  );
}
