export const SOCIAL_PLATFORMS = ["discord", "x", "instagram", "tiktok", "youtube", "facebook_group"] as const;

export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];
export type SocialPostStatus = "draft" | "needs_review" | "scheduled" | "published" | "failed";
export type SocialSourceType = "manual" | "battle_result";
export type SocialPublishMode = "api" | "manual" | "draft_only";

export type SocialTargetDraft = {
  platform: SocialPlatform;
  title: string;
  content: string;
  publishMode: SocialPublishMode;
  status: SocialPostStatus;
  manualPublishUrl: string | null;
  targetUrl: string | null;
  backgroundAudioUrl: string | null;
  backgroundAudioLabel: string | null;
  notes: string;
};

export type BattleSocialDraftInput = {
  battleId: string;
  battleCode?: string | null;
  winnerSide: "fighter_a" | "fighter_b";
  winnerName: string;
  winnerSong: string;
  opponentName: string;
  opponentSong: string;
  genre?: string | null;
  finalVoteLeft: number;
  finalVoteRight: number;
  totalVotes: number;
  resultUrl: string;
  battleUrl?: string | null;
  backgroundAudioUrl?: string | null;
};

export type ManualSocialDraftInput = {
  topic: string;
  body: string;
  cta?: string | null;
  linkUrl?: string | null;
  backgroundAudioUrl?: string | null;
  backgroundAudioLabel?: string | null;
};

export type SocialDraftBundle = {
  title: string;
  sourceType: SocialSourceType;
  targets: SocialTargetDraft[];
};

const FB_GROUP_URL = "https://www.facebook.com/groups/aipoger";

function cleanText(value: unknown, fallback = "") {
  const text = typeof value === "string" ? value.trim() : "";
  return text || fallback;
}

function positiveInt(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : 0;
}

function winnerVotes(input: BattleSocialDraftInput) {
  return input.winnerSide === "fighter_b" ? positiveInt(input.finalVoteRight) : positiveInt(input.finalVoteLeft);
}

function opponentVotes(input: BattleSocialDraftInput) {
  return input.winnerSide === "fighter_b" ? positiveInt(input.finalVoteLeft) : positiveInt(input.finalVoteRight);
}

function socialTags() {
  return "#AIPOGER #愛播歌 #AIMusic #SunoAI #DropBattle";
}

function appendLink(content: string, url: string) {
  const cleanUrl = url.trim();
  return cleanUrl ? `${content}\n\n${cleanUrl}` : content;
}

function noFortyFiveSeconds(text: string) {
  return text.replace(/45\s*[- ]?sec(?:ond)?s?/gi, "60s").replace(/45\s*秒/g, "30-60 秒");
}

function withBackgroundAudioNote(content: string, audioLabel: string | null, platform: SocialPlatform) {
  if (!audioLabel) return content;
  if (platform === "discord" || platform === "x") return content;
  return `${content}\n\n背景配樂：使用勝出作品《${audioLabel}》。`;
}

function target(
  platform: SocialPlatform,
  title: string,
  content: string,
  publishMode: SocialPublishMode,
  options: {
    targetUrl?: string | null;
    manualPublishUrl?: string | null;
    backgroundAudioUrl?: string | null;
    backgroundAudioLabel?: string | null;
    notes?: string;
  } = {},
): SocialTargetDraft {
  return {
    platform,
    title,
    content: noFortyFiveSeconds(withBackgroundAudioNote(content, options.backgroundAudioLabel ?? null, platform)),
    publishMode,
    status: "needs_review",
    targetUrl: options.targetUrl ?? null,
    manualPublishUrl: options.manualPublishUrl ?? null,
    backgroundAudioUrl: options.backgroundAudioUrl ?? null,
    backgroundAudioLabel: options.backgroundAudioLabel ?? null,
    notes: options.notes ?? "",
  };
}

export function buildBattleSocialDraft(input: BattleSocialDraftInput): SocialDraftBundle | null {
  const totalVotes = positiveInt(input.totalVotes);
  if (totalVotes <= 0) return null;

  const winnerName = cleanText(input.winnerName, "AIPOGER Creator");
  const winnerSong = cleanText(input.winnerSong, "Winner Drop");
  const opponentName = cleanText(input.opponentName, "Drop Rival");
  const opponentSong = cleanText(input.opponentSong, "Rival Drop");
  const genre = cleanText(input.genre, "AI Music");
  const resultUrl = cleanText(input.resultUrl);
  const battleUrl = cleanText(input.battleUrl);
  const audioUrl = cleanText(input.backgroundAudioUrl);
  const audioLabel = winnerSong;
  const score = `${winnerVotes(input)}:${opponentVotes(input)}`;
  const title = `AIPOGER 戰報｜${winnerName}《${winnerSong}》勝出`;
  const base = `AIPOGER 60s Drop Battle 戰報\n\n${winnerName}《${winnerSong}》擊敗 ${opponentName}《${opponentSong}》。\n\n類型：${genre}\n票數：${score}，共 ${totalVotes} 票\n\n這不是單純上傳作品，是讓 drop 上場被聽見、被投票、被認可。`;
  const cta = "進場看戰報，也帶你的 30-60 秒抓波來挑戰。";
  const shortCaption = `LEFT or RIGHT 的結果出爐。\n\n${winnerName}《${winnerSong}》在 AIPOGER 60s Drop Battle 勝出。\n票數 ${score}，共 ${totalVotes} 票。\n\n${cta}`;
  const videoScript = `短影音腳本：\n1. 開場顯示 Winner Card：${winnerName}《${winnerSong}》。\n2. 背景配樂使用勝出作品《${winnerSong}》。\n3. 中段顯示票數 ${score} 與類型 ${genre}。\n4. 結尾 CTA：帶你的 30-60 秒抓波進場 battle。`;

  return {
    title,
    sourceType: "battle_result",
    targets: [
      target("discord", title, appendLink(`${base}\n\n${cta}`, resultUrl), "api", {
        targetUrl: resultUrl,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel,
        notes: "可直接發到 Discord 戰報頻道。",
      }),
      target("x", title, appendLink(`${winnerName}《${winnerSong}》won an AIPOGER 60s Drop Battle.\n\n${score} votes in ${genre}.\n\nAI music needs recognition, not another buried upload feed.\n\nBring your 30-60s drop and let it fight.`, resultUrl), "api", {
        targetUrl: resultUrl,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel,
        notes: "X 第一版發文字與連結；音檔保留作素材提示。",
      }),
      target("instagram", title, `${shortCaption}\n\n${socialTags()}`, "draft_only", {
        targetUrl: resultUrl,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel,
        notes: "第一版產 IG 圖文/Reels 草稿；發布時把勝出音樂設為背景配樂。",
      }),
      target("tiktok", title, `${videoScript}\n\nCaption:\n${shortCaption}\n${socialTags()}`, "draft_only", {
        targetUrl: battleUrl || resultUrl,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel,
        notes: "第一版只產 TikTok 腳本與 caption；發布時使用勝出音樂。",
      }),
      target("youtube", title, `Shorts 標題：${winnerName}《${winnerSong}》贏下 AIPOGER 60s Drop Battle\n\nDescription:\n${shortCaption}\n\n看完整戰報：${resultUrl}\n${socialTags()}`, "draft_only", {
        targetUrl: resultUrl,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel,
        notes: "第一版只產 YouTube Shorts 標題與 description；發布時使用勝出音樂。",
      }),
      target("facebook_group", title, appendLink(`${base}\n\n${cta}\n\n${socialTags()}`, resultUrl), "manual", {
        targetUrl: resultUrl,
        manualPublishUrl: FB_GROUP_URL,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel,
        notes: "Facebook 社團採半自動：複製文案、下載素材、手動貼到社團。",
      }),
    ],
  };
}

export function buildManualSocialDraft(input: ManualSocialDraftInput): SocialDraftBundle {
  const topic = cleanText(input.topic, "AIPOGER 社群公告");
  const body = cleanText(input.body, "AIPOGER 愛播歌，AI 音樂創作者的 60s Drop Battle 舞台。");
  const cta = cleanText(input.cta, "加入 AIPOGER，帶你的 30-60 秒抓波進場。");
  const link = cleanText(input.linkUrl);
  const audioUrl = cleanText(input.backgroundAudioUrl);
  const audioLabel = cleanText(input.backgroundAudioLabel, audioUrl ? "指定背景音樂" : "");
  const base = `${topic}\n\n${body}\n\n${cta}`;

  return {
    title: topic,
    sourceType: "manual",
    targets: [
      target("discord", topic, appendLink(base, link), "api", { targetUrl: link || null, backgroundAudioUrl: audioUrl || null, backgroundAudioLabel: audioLabel || null }),
      target("x", topic, appendLink(`${body}\n\n${cta}`, link), "api", { targetUrl: link || null, backgroundAudioUrl: audioUrl || null, backgroundAudioLabel: audioLabel || null }),
      target("instagram", topic, `${base}\n\n${socialTags()}`, "draft_only", { targetUrl: link || null, backgroundAudioUrl: audioUrl || null, backgroundAudioLabel: audioLabel || null }),
      target("tiktok", topic, `短影音腳本：用戰報圖文快速講 ${topic}。\n\nCaption:\n${base}\n${socialTags()}`, "draft_only", { targetUrl: link || null, backgroundAudioUrl: audioUrl || null, backgroundAudioLabel: audioLabel || null }),
      target("youtube", topic, `Shorts 標題：${topic}\n\nDescription:\n${base}\n${link ? `\n${link}` : ""}\n${socialTags()}`, "draft_only", { targetUrl: link || null, backgroundAudioUrl: audioUrl || null, backgroundAudioLabel: audioLabel || null }),
      target("facebook_group", topic, appendLink(`${base}\n\n${socialTags()}`, link), "manual", {
        targetUrl: link || null,
        manualPublishUrl: FB_GROUP_URL,
        backgroundAudioUrl: audioUrl || null,
        backgroundAudioLabel: audioLabel || null,
      }),
    ],
  };
}
