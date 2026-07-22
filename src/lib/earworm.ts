import { canonicalMusicGenre, isCurrentMusicGenre, MUSIC_GENRE_VALUES } from "./music-genres.ts";

export const EARWORM_TRACK_COUNT = 10;
export const EARWORM_MIN_LISTEN_SECONDS = 8;

export type EarwormReaction = "love" | "replay" | "okay" | "pass";

export type EarwormAnswer = {
  trackId: string;
  genre: string;
  reaction: EarwormReaction;
  listenedSeconds: number;
};

export type EarwormPersonalityResult = {
  primaryGenre: string;
  secondaryGenres: string[];
  scores: Record<string, number>;
  keywords: string[];
  signal: "strong" | "clear" | "exploring";
};

export const EARWORM_REACTION_POINTS: Record<EarwormReaction, number> = {
  love: 4,
  replay: 3,
  okay: 1,
  pass: 0,
};

export const EARWORM_GENRE_PERSONALITY: Record<string, { keywords: string[]; description: string }> = {
  "K-Pop 韓式動感": { keywords: ["精準節拍", "強副歌", "舞台感"], description: "你的耳朵喜歡俐落節奏、鮮明段落與一聽就記住的舞台能量。" },
  "Rap 街頭說唱": { keywords: ["語氣", "節奏", "態度"], description: "你會先聽見語氣與律動，音樂要有立場，也要有自己的走路方式。" },
  "Disco / Funk / City-Pop": { keywords: ["Groove", "復古光澤", "都會感"], description: "你的耳朵容易被律動、貝斯線與帶著夜色的都會光澤勾住。" },
  "R&B 深情瞬間": { keywords: ["情緒", "人聲", "慢熱"], description: "你在意人聲裡的溫度與情緒轉折，比起大聲，你更容易被真心留下來。" },
  "Band Rock 熱血搖滾": { keywords: ["爆發", "樂團能量", "現場感"], description: "你喜歡音樂真正衝出來的瞬間，鼓、吉他與現場張力會讓你醒過來。" },
  "EDM 百大電音": { keywords: ["推進", "低頻", "高潮"], description: "你的耳朵追著能量走，喜歡清楚的推進、低頻壓力與準時抵達的高潮。" },
  "Jazz / Bossa 微醺時刻": { keywords: ["鬆弛", "和聲", "微醺"], description: "你喜歡留白、和聲與不急著證明自己的節奏，越耐聽越容易留下來。" },
  "Spiritual / Ambient 放鬆宇宙": { keywords: ["空間", "氛圍", "沉浸"], description: "你會被聲音的空間包住，音樂不一定要有答案，但必須讓你進入另一個狀態。" },
  "Chinese Fusion 新派古風": { keywords: ["東方旋律", "敘事", "融合"], description: "你對東方旋律與新聲響的交會特別敏感，喜歡作品有畫面，也有故事。" },
  "台語熊high": { keywords: ["台味", "直覺", "熱鬧"], description: "你的耳朵很誠實，接地氣、夠有趣、能讓現場一起動起來的歌最容易打中你。" },
  "Original 自我風格": { keywords: ["驚喜", "非典型", "探索"], description: "你不急著替音樂分類，反而會被沒聽過的組合、怪點子與個人辨識度吸引。" },
};

export function isEarwormReaction(value: unknown): value is EarwormReaction {
  return value === "love" || value === "replay" || value === "okay" || value === "pass";
}

export function earwormQuizKey(trackIds: string[]) {
  return `earworm-quiz:${trackIds.join(":")}`;
}

export function calculateEarwormResult(answers: EarwormAnswer[]): EarwormPersonalityResult {
  const totals = new Map<string, { points: number; exposures: number; loves: number }>();

  for (const answer of answers) {
    const genre = canonicalMusicGenre(answer.genre);
    if (!isCurrentMusicGenre(genre) || !isEarwormReaction(answer.reaction)) continue;
    const current = totals.get(genre) ?? { points: 0, exposures: 0, loves: 0 };
    current.points += EARWORM_REACTION_POINTS[answer.reaction];
    current.exposures += 1;
    if (answer.reaction === "love") current.loves += 1;
    totals.set(genre, current);
  }

  const ranked = MUSIC_GENRE_VALUES
    .map((genre, fixedOrder) => {
      const current = totals.get(genre) ?? { points: 0, exposures: 0, loves: 0 };
      const score = current.exposures > 0
        ? Math.round((current.points / (current.exposures * EARWORM_REACTION_POINTS.love)) * 100)
        : -1;
      return { genre, score, loves: current.loves, fixedOrder };
    })
    .filter((item) => item.score >= 0)
    .sort((left, right) => right.score - left.score || right.loves - left.loves || left.fixedOrder - right.fixedOrder);

  const fallbackGenre = MUSIC_GENRE_VALUES[0];
  const primaryGenre = ranked[0]?.genre ?? fallbackGenre;
  const primaryScore = Math.max(0, ranked[0]?.score ?? 0);
  const scores = Object.fromEntries(ranked.map((item) => [item.genre, item.score]));

  return {
    primaryGenre,
    secondaryGenres: ranked.slice(1, 3).map((item) => item.genre),
    scores,
    keywords: EARWORM_GENRE_PERSONALITY[primaryGenre]?.keywords ?? ["節奏", "情緒", "探索"],
    signal: primaryScore >= 75 ? "strong" : primaryScore >= 50 ? "clear" : "exploring",
  };
}
