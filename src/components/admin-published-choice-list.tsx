"use client";

import Link from "next/link";
import { ExternalLink, Star, Trash2 } from "lucide-react";
import { AipogerChoiceCover } from "@/components/aipoger-choice-cover";
import { AIPOGER_BRAND_LOGO } from "@/lib/brand";

export type ChoiceLibraryEntry = {
  id: string;
  kind: "official" | "creator";
  weekStart: string;
  title: string;
  curatorName: string;
  isPublished: boolean;
  itemCount: number;
  coverUrl: string | null;
  href: string;
};

export function displayTitle(entry: ChoiceLibraryEntry) {
  return entry.title.trim() || `${entry.curatorName.trim() || "AIPOGER"} Choice`;
}

export function PublishedChoiceList({ entries, featuredKey, busy, onFeature, onDelete }: {
  entries: ChoiceLibraryEntry[];
  featuredKey: string;
  busy: boolean;
  onFeature: (key: string | null) => void;
  onDelete: (entry: ChoiceLibraryEntry) => void;
}) {
  return <div className="divide-y divide-white/10">
    {entries.map((entry) => {
      const key = `${entry.kind}:${entry.id}`;
      const featured = key === featuredKey;
      return <article key={key} className="flex min-w-0 flex-wrap items-center gap-3 py-4 sm:flex-nowrap">
        <Link href={entry.href} className="h-16 w-16 shrink-0 overflow-hidden rounded border border-white/10 bg-zinc-900" aria-label={`查看 ${displayTitle(entry)}`}>
          <AipogerChoiceCover src={entry.coverUrl || AIPOGER_BRAND_LOGO} className="h-full w-full" logoClassName="h-5 w-6" />
        </Link>
        <div className="min-w-0 flex-1 basis-[calc(100%-5rem)] sm:basis-auto">
          <Link href={entry.href} className="block break-words text-sm font-bold text-white hover:text-orange-200">{displayTitle(entry)}</Link>
          <p className="mt-1 break-words text-xs text-zinc-400">{entry.curatorName} · {entry.itemCount} 首</p>
          <p className="mt-1 text-xs text-zinc-500">{entry.weekStart}{featured ? <span className="ml-3 text-orange-300">Showtime 主推</span> : null}</p>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-2">
          <Link href={entry.href} title="查看公開歌單" aria-label={`查看 ${displayTitle(entry)} 公開歌單`} className="flex h-11 w-11 items-center justify-center rounded border border-white/15 text-zinc-300 hover:text-white"><ExternalLink className="h-4 w-4" /></Link>
          <button type="button" disabled={busy} aria-pressed={featured} title={featured ? "取消主推" : "設為主推"} aria-label={`${featured ? "取消主推" : "設為主推"} ${displayTitle(entry)}`} onClick={() => onFeature(featured ? null : key)} className={`flex h-11 w-11 items-center justify-center rounded border disabled:opacity-40 ${featured ? "border-orange-300 text-orange-300" : "border-white/15 text-zinc-400 hover:text-orange-300"}`}><Star className="h-4 w-4" fill={featured ? "currentColor" : "none"} /></button>
          <button type="button" disabled={busy} title="刪除 Choice" aria-label={`刪除 ${displayTitle(entry)}`} onClick={() => onDelete(entry)} className="flex h-11 w-11 items-center justify-center rounded border border-red-300/25 text-red-300 hover:bg-red-500/10 disabled:opacity-40"><Trash2 className="h-4 w-4" /></button>
        </div>
      </article>;
    })}
  </div>;
}
