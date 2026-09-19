const DROP_BATTLE_EXPECTED_END_BUFFER_MS = (45 * 2 + 2 + 5 + 30) * 1000;
const CLOSED_DROP_BATTLE_STATUSES = new Set([
  "finished",
  "cancelled",
  "cancelled_no_challenger",
  "cancelled_founder",
  "completed",
  "expired",
]);

export type DropBattleLinkBattleSnapshot = {
  status?: string | null;
  battle_type?: string | null;
  battle_ended_at?: string | null;
  scheduled_start_at?: string | null;
  battle_started_at?: string | null;
  started_at?: string | null;
  created_at?: string | null;
};

export type DropBattleLinkClaimSnapshot = {
  status?: string | null;
  claim_window_ends_at?: string | null;
  upload_deadline_at?: string | null;
  next_battle_id?: string | null;
};

export type DropBattleLinkResolution =
  | { action: "stay"; reason: "active_battle" | "active_rematch" }
  | { action: "redirect"; href: string; reason: "next_rematch_battle" | "ended_to_listen_bar" };

function resolveRuntimeStart(battle: DropBattleLinkBattleSnapshot | null | undefined): string | null {
  return battle?.scheduled_start_at ?? battle?.battle_started_at ?? battle?.started_at ?? battle?.created_at ?? null;
}

function isEndedOrPastExpectedEnd(battle: DropBattleLinkBattleSnapshot | null | undefined, nowMs: number) {
  if (!battle) return false;
  if (battle.battle_ended_at || CLOSED_DROP_BATTLE_STATUSES.has(battle.status ?? "")) return true;
  const startMs = new Date(resolveRuntimeStart(battle) ?? "").getTime();
  return Number.isFinite(startMs) && startMs + DROP_BATTLE_EXPECTED_END_BUFFER_MS <= nowMs;
}

export function isActiveDropRematchClaim(claim: DropBattleLinkClaimSnapshot | null | undefined, nowMs = Date.now()) {
  if (!claim) return false;
  if (claim.status === "open") {
    const endsMs = new Date(claim.claim_window_ends_at ?? "").getTime();
    return Number.isFinite(endsMs) && endsMs > nowMs;
  }
  if (claim.status === "claimed") {
    const deadlineMs = new Date(claim.upload_deadline_at ?? "").getTime();
    return Number.isFinite(deadlineMs) && deadlineMs > nowMs;
  }
  return false;
}

export function resolveDropBattleLinkResolution(args: {
  battle: DropBattleLinkBattleSnapshot | null | undefined;
  claim?: DropBattleLinkClaimSnapshot | null;
  lang?: "zh" | "en";
  nowMs?: number;
}): DropBattleLinkResolution {
  const lang = args.lang === "en" ? "en" : "zh";
  const battle = args.battle;
  const claim = args.claim ?? null;
  const nowMs = args.nowMs ?? Date.now();
  const battleType = battle?.battle_type ?? "formal";

  if (battleType !== "formal") {
    return { action: "stay", reason: "active_battle" };
  }

  if (claim?.status === "uploaded" && claim.next_battle_id) {
    return {
      action: "redirect",
      href: `/battle/${encodeURIComponent(claim.next_battle_id)}?lang=${lang}`,
      reason: "next_rematch_battle",
    };
  }

  if (isActiveDropRematchClaim(claim, nowMs)) {
    return { action: "stay", reason: "active_rematch" };
  }

  if (!isEndedOrPastExpectedEnd(battle, nowMs)) {
    return { action: "stay", reason: "active_battle" };
  }

  return {
    action: "redirect",
    href: `/listen-bar?lang=${lang}`,
    reason: "ended_to_listen_bar",
  };
}
