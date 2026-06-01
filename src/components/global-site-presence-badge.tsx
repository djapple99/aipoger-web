"use client";

import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { usePresenceCount } from "@/lib/use-presence-count";

const HIDDEN_PREFIXES = ["/battle/waiting-room", "/battle/mock-"];
const HIDDEN_EXACT = new Set(["/listen-bar", "/auth"]);
const FIXED_BATTLE_ROUTES = new Set(["setup", "hook-cut", "matchmaking", "result"]);

function shouldHide(pathname: string | null) {
  const path = pathname ?? "/";
  if (HIDDEN_EXACT.has(path)) return true;
  if (HIDDEN_PREFIXES.some((prefix) => path.startsWith(prefix))) return true;

  const battleSeg = path.match(/^\/battle\/([^/]+)$/)?.[1];
  return Boolean(battleSeg && !FIXED_BATTLE_ROUTES.has(battleSeg));
}

export default function GlobalSitePresenceBadge() {
  const pathname = usePathname();
  const { lang } = useI18n();
  const count = usePresenceCount("presence-aipoger-site", !shouldHide(pathname), "site");

  if (shouldHide(pathname)) return null;

  const isZh = lang === "zh";
  const label =
    count <= 1
      ? isZh
        ? "AIPOGER 現場升溫中"
        : "AIPOGER is warming up"
      : isZh
        ? `AIPOGER 現場 ${count} 人`
        : `${count} live on AIPOGER`;

  return (
    <div className="pointer-events-none fixed left-1/2 top-4 z-40 hidden -translate-x-1/2 sm:block">
      <div className="inline-flex items-center gap-2 rounded-full border border-orange-300/25 bg-black/58 px-3 py-2 text-[11px] font-black uppercase tracking-[0.14em] text-orange-100 shadow-[0_12px_40px_rgba(0,0,0,0.38),0_0_22px_rgba(249,115,22,0.14)] backdrop-blur-xl">
        <span className="relative flex h-2 w-2">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-orange-300 opacity-70" />
          <span className="relative inline-flex h-2 w-2 rounded-full bg-orange-300" />
        </span>
        {label}
      </div>
    </div>
  );
}
