import { canonicalMusicGenre, isCurrentMusicGenre } from "./music-genres.ts";
import { AIPOGER_BRAND_LOGO } from "./brand.ts";

export const MONTHLY_CHART_MIN_SUPPORTERS = 3;

export type MonthlyChartTrack = {
  id: string;
  title: string;
  artist: string;
  genre: string;
  aiTool: string;
  coverUrl: string;
  audioUrl: string;
  lyrics: string;
  rank: number | null;
  supporterCount: number;
};

export type MonthlyChartResponse = {
  currentMonth: string;
  availableMonths: string[];
  month: string;
  status: "live" | "final";
  minSupporters: number;
  finalizedAt: string | null;
  tracks: MonthlyChartTrack[];
};

export class MonthlyChartError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MonthlyChartError";
    this.status = status;
  }
}

export function monthlyChartQuery(params: URLSearchParams) {
  const month = params.get("month");
  if (month !== null && !/^[1-9][0-9]{3}-(0[1-9]|1[0-2])$/.test(month)) {
    throw new MonthlyChartError("Invalid chart month.", 400);
  }
  const rawGenre = params.get("genre")?.trim();
  const genre = !rawGenre || rawGenre === "all" ? null : canonicalMusicGenre(rawGenre);
  if (genre && !isCurrentMusicGenre(genre)) throw new MonthlyChartError("Invalid chart genre.", 400);
  // The server's local clock never determines future-month eligibility.
  return { p_month: month, p_genre: genre };
}

type MonthlyChartRpcTrack = Omit<MonthlyChartTrack, "audioUrl" | "coverUrl"> & {
  audioPath: string;
  coverPath: string | null;
};
export type MonthlyChartRpcResponse = Omit<MonthlyChartResponse, "tracks"> & { tracks: MonthlyChartRpcTrack[] };

export type MonthlyChartRpcClient = {
  rpc: (name: "read_monthly_chart" | "finalize_monthly_charts", args?: { p_month: string | null; p_genre: string | null }) => PromiseLike<{
    data: unknown;
    error: { code?: string; message?: string } | null;
  }>;
};

function rpcError(error: { code?: string; message?: string }): MonthlyChartError {
  if (error.code === "22023") return new MonthlyChartError("Invalid or future chart month or genre.", 400);
  if (error.message === "MONTHLY_CHART_NOT_ENABLED") return new MonthlyChartError("Monthly charts were not enabled for this month.", 404);
  return new MonthlyChartError("Monthly charts are temporarily unavailable.", 503);
}

// Explicit allowlisting prevents DB-only fields (including identity fields) from
// leaking through the public endpoint if a future RPC adds internal metadata.
export function publicMonthlyChart(data: MonthlyChartRpcResponse, storageUrl: (bucket: string, path: string) => string): MonthlyChartResponse {
  const mediaUrl = (bucket: string, path: string | null) => {
    const clean = path?.trim();
    if (!clean) return "";
    if (/^https?:\/\//i.test(clean)) return clean;
    if (/^[a-z][a-z\d+.-]*:/i.test(clean) || clean.startsWith("//")) return "";
    return storageUrl(bucket, clean);
  };
  return {
    currentMonth: data.currentMonth,
    availableMonths: data.availableMonths,
    month: data.month,
    status: data.status,
    minSupporters: data.minSupporters,
    finalizedAt: data.finalizedAt,
    tracks: data.tracks.flatMap((track) => {
      const audioUrl = mediaUrl("listen-bar-audio", track.audioPath);
      if (!audioUrl) return [];
      return [{
        id: track.id, title: track.title, artist: track.artist, genre: track.genre,
        aiTool: track.aiTool, lyrics: track.lyrics, rank: track.rank,
        supporterCount: track.supporterCount, audioUrl,
        coverUrl: mediaUrl("listen-bar-covers", track.coverPath) || AIPOGER_BRAND_LOGO,
      }];
    }),
  };
}

export async function readMonthlyChart(admin: MonthlyChartRpcClient, params: URLSearchParams,
  storageUrl: (bucket: string, path: string) => string): Promise<MonthlyChartResponse> {
  const { data, error } = await admin.rpc("read_monthly_chart", monthlyChartQuery(params));
  if (error) throw rpcError(error);
  if (!data || typeof data !== "object" || !Array.isArray((data as MonthlyChartRpcResponse).tracks)) {
    throw new MonthlyChartError("Monthly charts are temporarily unavailable.", 503);
  }
  return publicMonthlyChart(data as MonthlyChartRpcResponse, storageUrl);
}

export async function finalizeMonthlyCharts(admin: MonthlyChartRpcClient): Promise<number> {
  const { data, error } = await admin.rpc("finalize_monthly_charts");
  if (error) throw rpcError(error);
  if (typeof data !== "number" || !Number.isSafeInteger(data) || data < 0) {
    throw new MonthlyChartError("Monthly chart finalization failed.", 503);
  }
  return data;
}
