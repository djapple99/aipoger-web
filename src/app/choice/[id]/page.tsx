"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import type { AipogerCreatorChoiceCollection } from "@/lib/creator-choice";

type ChoiceResponse = {
  collection?: AipogerCreatorChoiceCollection;
  error?: string;
};

function displayDate(value: string) {
  const date = new Date(`${value.slice(0, 10)}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-TW", { year: "numeric", month: "long", day: "numeric" }).format(date);
}

export default function PublicCreatorChoicePage() {
  const params = useParams<{ id: string }>();
  const choiceId = typeof params.id === "string" ? params.id : "";
  const [collection, setCollection] = useState<AipogerCreatorChoiceCollection | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!choiceId) return;
    let alive = true;
    void fetch(`/api/creator-choice/${encodeURIComponent(choiceId)}`, { cache: "no-store" })
      .then(async (response) => {
        const payload = (await response.json().catch(() => null)) as ChoiceResponse | null;
        if (!response.ok) throw new Error(payload?.error || "找不到這份 Choice。");
        if (!payload?.collection) throw new Error("找不到這份 Choice。");
        if (alive) setCollection(payload.collection);
      })
      .catch((loadError) => {
        if (alive) setError(loadError instanceof Error ? loadError.message : "Choice 暫時無法讀取。");
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [choiceId]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError("無法複製連結，請從瀏覽器網址列分享。");
    }
  }, []);

  if (loading) return <main className="min-h-screen bg-[#050505] px-5 py-14 text-sm font-black text-zinc-400">正在開啟 Choice...</main>;
  if (!collection) return <main className="min-h-screen bg-[#050505] px-5 py-14 text-sm font-black text-red-100">{error || "找不到這份 Choice。"}</main>;

  return (
    <main className="min-h-screen bg-[#050505] px-4 pb-16 pt-10 text-zinc-100 sm:px-7 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="border-b border-yellow-200/20 pb-6 text-center">
          <p className="text-xs font-black uppercase tracking-[0.28em] text-yellow-100/75">CREATOR CHOICE</p>
          <h1 className="mt-3 text-3xl font-black text-white sm:text-5xl">{collection.title || `${collection.curatorName} 的 Choice`}</h1>
          <p className="mt-3 text-sm font-bold text-zinc-400">策展：{collection.curatorName} · {displayDate(collection.weekStart)}</p>
          {collection.intro ? <p className="mx-auto mt-5 max-w-2xl text-base font-bold leading-7 text-zinc-300">{collection.intro}</p> : null}
          <div className="mt-6 flex flex-wrap justify-center gap-2"><button type="button" onClick={() => void copyLink()} className="border border-yellow-200/35 bg-yellow-300/10 px-4 py-2 text-xs font-black text-yellow-100 transition hover:border-yellow-100/70">{copied ? "連結已複製" : "分享這份 Choice"}</button><Link href="/rank?lang=zh" className="border border-white/15 px-4 py-2 text-xs font-black text-zinc-100 transition hover:border-white/35">探索 Showtime</Link></div>
        </header>
        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-white">選曲</h2>
            <span className="text-xs font-bold text-zinc-500">{collection.items.length} 首 Showtime 認證作品</span>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {collection.items.map((item, index) => (
              <article key={item.itemId} className="min-w-0 border border-white/10 bg-black/35 p-2.5">
                <div className="relative aspect-square overflow-hidden bg-zinc-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.coverUrl} alt="" className="h-full w-full object-cover" />
                  <span className="absolute left-1 top-1 rounded bg-black/85 px-1.5 py-1 text-[10px] font-black text-yellow-100">{index + 1}</span>
                </div>
                <h3 className="mt-3 truncate text-sm font-black text-white">{item.title}</h3>
                <p className="mt-1 truncate text-xs font-bold text-zinc-400">{item.artist}</p>
                <p className="mt-1 truncate text-[11px] font-bold text-zinc-500">{item.genre} · {item.recognition}</p>
              </article>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}
