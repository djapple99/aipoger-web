import { NextRequest, NextResponse } from "next/server";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

type StoredBarMessage = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
};

type ListenBarMessageRow = {
  id: string;
  user_id?: string | null;
  display_name?: string | null;
  body?: string | null;
  created_at?: string | null;
};

type ListenBarDatabase = {
  public: {
    Tables: {
      listen_bar_messages: {
        Row: ListenBarMessageRow;
        Insert: {
          user_id?: string | null;
          display_name?: string | null;
          body: string;
          created_at?: string;
        };
        Update: Partial<ListenBarDatabase["public"]["Tables"]["listen_bar_messages"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

type AdminClient = SupabaseClient<ListenBarDatabase>;

const DATA_BUCKET = "listen-bar-data";
const MESSAGE_PATH = "bar-talk/messages.json";
const MESSAGE_LIMIT = 80;
const MESSAGE_MAX_LENGTH = 240;
const WINDOW_MS = 24 * 60 * 60 * 1000;

function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function tokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return null;
  return auth.slice("Bearer ".length).trim() || null;
}

function adminClient(): AdminClient {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient<ListenBarDatabase>(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizeMessage(row: ListenBarMessageRow): StoredBarMessage | null {
  const text = row.body?.trim();
  if (!row.id || !text) return null;
  const displayName = row.display_name?.trim();
  return {
    id: row.id,
    name: !displayName || displayName === "訪客" ? "吧友" : displayName,
    text,
    createdAt: row.created_at ?? new Date().toISOString(),
  };
}

function isRecent(message: StoredBarMessage) {
  const time = new Date(message.createdAt).getTime();
  return Number.isFinite(time) && Date.now() - time <= WINDOW_MS;
}

async function ensureDataBucket(admin: AdminClient) {
  const { data } = await admin.storage.getBucket(DATA_BUCKET);
  if (data) return;
  await admin.storage.createBucket(DATA_BUCKET, {
    public: false,
    fileSizeLimit: 1024 * 1024,
    allowedMimeTypes: ["application/json"],
  });
}

async function readStoredMessages(admin: AdminClient) {
  await ensureDataBucket(admin);
  const { data, error } = await admin.storage.from(DATA_BUCKET).download(MESSAGE_PATH);
  if (error) {
    if (/not found|not exist|404/i.test(error.message)) return [];
    throw error;
  }
  const parsed = JSON.parse(await data.text()) as unknown;
  if (!Array.isArray(parsed)) return [];
  return parsed.filter((item): item is StoredBarMessage => (
    typeof item === "object" &&
    item !== null &&
    typeof (item as StoredBarMessage).id === "string" &&
    typeof (item as StoredBarMessage).name === "string" &&
    typeof (item as StoredBarMessage).text === "string" &&
    typeof (item as StoredBarMessage).createdAt === "string"
  ));
}

async function writeStoredMessages(admin: AdminClient, messages: StoredBarMessage[]) {
  await ensureDataBucket(admin);
  const recentMessages = messages.filter(isRecent).slice(-MESSAGE_LIMIT);
  const { error } = await admin.storage.from(DATA_BUCKET).upload(
    MESSAGE_PATH,
    new Blob([JSON.stringify(recentMessages, null, 2)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (error) throw error;
}

async function readDatabaseMessages(admin: AdminClient) {
  const since24h = new Date(Date.now() - WINDOW_MS).toISOString();
  const { data, error } = await admin
    .from("listen_bar_messages")
    .select("id, display_name, body, created_at")
    .gte("created_at", since24h)
    .order("created_at", { ascending: false })
    .limit(MESSAGE_LIMIT);
  if (error) throw error;
  return ((data as ListenBarMessageRow[] | null) ?? [])
    .map(normalizeMessage)
    .filter((message): message is StoredBarMessage => message !== null)
    .reverse();
}

async function insertDatabaseMessage(admin: AdminClient, message: StoredBarMessage, userId: string | null) {
  const { data, error } = await admin
    .from("listen_bar_messages")
    .insert({
      user_id: userId,
      display_name: message.name,
      body: message.text,
    })
    .select("id, display_name, body, created_at")
    .maybeSingle();
  if (error) throw error;
  return data ? normalizeMessage(data as ListenBarMessageRow) : message;
}

export async function GET() {
  try {
    const admin = adminClient();
    try {
      const messages = await readDatabaseMessages(admin);
      return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
    } catch {
      const messages = (await readStoredMessages(admin)).filter(isRecent).slice(-MESSAGE_LIMIT);
      return NextResponse.json({ messages }, { headers: { "Cache-Control": "no-store" } });
    }
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}

export async function POST(request: NextRequest) {
  const token = tokenFromRequest(request);
  if (!token) return jsonError("請先登入再留言。", 401);

  const body = (await request.json().catch(() => null)) as {
    displayName?: unknown;
    text?: unknown;
  } | null;
  const text = typeof body?.text === "string" ? body.text.trim().slice(0, MESSAGE_MAX_LENGTH) : "";
  if (!text) return jsonError("Empty message.");

  try {
    const admin = adminClient();
    const { data: userData, error: userError } = await admin.auth.getUser(token);
    if (userError || !userData.user) return jsonError("登入狀態已過期，請重新登入。", 401);
    const user = userData.user;
    const displayName = typeof body?.displayName === "string" && body.displayName.trim()
      ? body.displayName.trim().slice(0, 48)
      : user.email?.split("@")[0] ?? "吧友";
    const draft: StoredBarMessage = {
      id: crypto.randomUUID(),
      name: displayName,
      text,
      createdAt: new Date().toISOString(),
    };

    try {
      const message = await insertDatabaseMessage(admin, draft, user.id);
      return NextResponse.json({ message });
    } catch {
      const messages = await readStoredMessages(admin);
      const nextMessages = [...messages, draft].filter(isRecent).slice(-MESSAGE_LIMIT);
      await writeStoredMessages(admin, nextMessages);
      return NextResponse.json({ message: draft });
    }
  } catch (error) {
    return jsonError(String((error as { message?: string })?.message ?? error), 500);
  }
}
