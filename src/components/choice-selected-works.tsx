"use client";

import { useEffect, useState } from "react";
import { Play, Trash2 } from "lucide-react";
import type { AipogerChoiceItem } from "@/lib/aipoger-choice";

type ChoiceSelectedWorksProps = {
  items: AipogerChoiceItem[];
  busy: boolean;
  layout?: "sidebar" | "wide";
  onPreview: (item: AipogerChoiceItem) => void;
  onMove: (itemId: string, position: number) => Promise<boolean>;
  onRemove: (itemId: string) => void;
};

type PositionInputProps = {
  title: string;
  position: number;
  max: number;
  disabled: boolean;
  onCommit: (position: number) => Promise<boolean>;
};

function PositionInput({ title, position, max, disabled, onCommit }: PositionInputProps) {
  const [value, setValue] = useState(String(position));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setValue(String(position));
  }, [position]);

  async function commit() {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed)) {
      setValue(String(position));
      return;
    }

    const nextPosition = Math.min(max, Math.max(1, parsed));
    setValue(String(nextPosition));
    if (nextPosition === position) return;

    setSubmitting(true);
    const moved = await onCommit(nextPosition);
    if (!moved) setValue(String(position));
    setSubmitting(false);
  }

  return (
    <input
      type="number"
      inputMode="numeric"
      min={1}
      max={max}
      value={value}
      disabled={disabled || submitting}
      onChange={(event) => setValue(event.target.value)}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => void commit()}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setValue(String(position));
          event.currentTarget.blur();
        }
      }}
      aria-label={`${title} 的播放順序`}
      title="直接輸入播放順序"
      className="h-10 w-10 shrink-0 border border-cyan-100/25 bg-cyan-300/[0.06] text-center text-sm font-black text-cyan-100 outline-none [appearance:textfield] focus:border-cyan-100 focus:bg-cyan-300/10 disabled:opacity-40 sm:h-8 sm:w-8 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

export function ChoiceSelectedWorks({
  items,
  busy,
  layout = "wide",
  onPreview,
  onMove,
  onRemove,
}: ChoiceSelectedWorksProps) {
  const columns = layout === "sidebar" ? "md:grid-cols-2 xl:grid-cols-1" : "md:grid-cols-2";

  return (
    <div className={`grid min-w-0 gap-2 ${columns}`}>
      {items.map((item, index) => (
        <article
          key={item.itemId}
          className="grid min-w-0 grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_auto] items-center gap-2 border border-white/10 bg-black/35 p-2"
        >
          <PositionInput
            title={item.title}
            position={index + 1}
            max={items.length}
            disabled={busy}
            onCommit={(position) => onMove(item.itemId, position)}
          />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={item.coverUrl} alt="" className="h-10 w-10 object-cover sm:h-9 sm:w-9" />
          <div className="min-w-0">
            <p className="truncate text-sm font-black text-white">{item.title}</p>
            <p className="truncate text-[11px] font-bold text-zinc-500">{item.artist} · {item.genre}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={!item.audioUrl}
              onClick={() => onPreview(item)}
              className="flex h-10 w-10 items-center justify-center border border-cyan-100/25 text-cyan-100 transition hover:border-cyan-100/60 hover:bg-cyan-300/10 disabled:cursor-not-allowed disabled:opacity-30 sm:h-8 sm:w-8"
              aria-label={`播放 ${item.title}`}
              title={item.audioUrl ? "播放試聽" : "目前沒有可播放音檔"}
            >
              <Play aria-hidden="true" size={14} fill="currentColor" />
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => onRemove(item.itemId)}
              className="flex h-10 w-10 items-center justify-center border border-red-200/25 text-red-100 transition hover:border-red-200/55 hover:bg-red-400/10 disabled:opacity-30 sm:h-8 sm:w-8"
              aria-label={`移除 ${item.title}`}
              title="移除作品"
            >
              <Trash2 aria-hidden="true" size={14} />
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
