export type OfficialGatekeeperDrop = {
  id: string;
  gateNumber: string;
  title: string;
  genre: string;
  aiTool: string;
  description: string | null;
  audioPath: string | null;
  audioUrl?: string | null;
  active: boolean;
  sortOrder: number;
  createdBy?: string | null;
  updatedBy?: string | null;
  updatedAt?: string | null;
};

export const OFFICIAL_GATEKEEPER_DROP_IDS = [
  "gate-01-heartbreak",
  "gate-02-city-pop",
  "gate-03-club-edm",
  "gate-04-rap-rnb",
] as const;

export const OFFICIAL_GATEKEEPER_DROP_DEFAULTS: OfficialGatekeeperDrop[] = [
  {
    id: "gate-01-heartbreak",
    gateNumber: "GATE 01",
    title: "官方守門 Drop",
    genre: "感人抒情",
    aiTool: "Suno",
    description: "挑戰這首官方 Drop，設定開戰時間並分享拉人投票。",
    audioPath: null,
    active: false,
    sortOrder: 1,
  },
  {
    id: "gate-02-city-pop",
    gateNumber: "GATE 02",
    title: "官方守門 Drop",
    genre: "復古City-Pop",
    aiTool: "Suno",
    description: "挑戰這首官方 Drop，設定開戰時間並分享拉人投票。",
    audioPath: null,
    active: false,
    sortOrder: 2,
  },
  {
    id: "gate-03-club-edm",
    gateNumber: "GATE 03",
    title: "官方守門 Drop",
    genre: "動感電音",
    aiTool: "Suno",
    description: "挑戰這首官方 Drop，設定開戰時間並分享拉人投票。",
    audioPath: null,
    active: false,
    sortOrder: 3,
  },
  {
    id: "gate-04-rap-rnb",
    gateNumber: "GATE 04",
    title: "官方守門 Drop",
    genre: "說唱街頭風",
    aiTool: "Suno",
    description: "挑戰這首官方 Drop，設定開戰時間並分享拉人投票。",
    audioPath: null,
    active: false,
    sortOrder: 4,
  },
];

export function normalizeOfficialGatekeeperDrop(row: Record<string, unknown>): OfficialGatekeeperDrop {
  return {
    id: String(row.id ?? ""),
    gateNumber: String(row.gate_number ?? row.gateNumber ?? ""),
    title: String(row.title ?? "官方守門 Drop"),
    genre: String(row.genre ?? "AI Music"),
    aiTool: String(row.ai_tool ?? row.aiTool ?? "AI Music"),
    description: typeof row.description === "string" ? row.description : null,
    audioPath: typeof row.audio_path === "string" && row.audio_path.trim() ? row.audio_path.trim() : null,
    audioUrl: typeof row.audioUrl === "string" ? row.audioUrl : null,
    active: Boolean(row.active),
    sortOrder: Number(row.sort_order ?? row.sortOrder ?? 999),
    createdBy: typeof row.created_by === "string" ? row.created_by : null,
    updatedBy: typeof row.updated_by === "string" ? row.updated_by : null,
    updatedAt: typeof row.updated_at === "string" ? row.updated_at : null,
  };
}
