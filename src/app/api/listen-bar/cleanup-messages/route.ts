import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

type StoredBarMessage = {
  id: string;
  name: string;
  text: string;
  createdAt: string;
};

const DATA_BUCKET = "listen-bar-data";
const MESSAGE_PATH = "bar-talk/messages.json";
const MESSAGE_LIMIT = 80;
const MESSAGE_RETENTION_HOURS = 8;
const MESSAGE_RETENTION_MS = MESSAGE_RETENTION_HOURS * 60 * 60 * 1000;

function isMissingStorageObject(error: unknown) {
  const message = String((error as { message?: string } | null)?.message ?? error ?? "");
  return /not found|not exist|404/i.test(message);
}

function isMissingListenBarMessagesTable(error: unknown) {
  const text = error && typeof error === "object"
    ? [
        (error as { message?: string }).message,
        (error as { details?: string }).details,
        (error as { hint?: string }).hint,
        (error as { code?: string }).code,
      ].filter(Boolean).join(" ")
    : String(error ?? "");
  return /listen_bar_messages|schema cache|relation.*does not exist|Could not find the table|PGRST205/i.test(text);
}

function isRecent(message: StoredBarMessage) {
  const time = new Date(message.createdAt).getTime();
  return Number.isFinite(time) && Date.now() - time <= MESSAGE_RETENTION_MS;
}

function adminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_KEY;
  if (!supabaseUrl || !serviceKey) throw new Error("Missing Supabase server configuration.");
  return createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function assertCronAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return true;
  const auth = request.headers.get("authorization") ?? "";
  const token = auth.startsWith("Bearer ") ? auth.slice("Bearer ".length) : request.nextUrl.searchParams.get("secret");
  return token === cronSecret;
}

async function cleanupStoredMessages(admin: ReturnType<typeof adminClient>) {
  const { data, error } = await admin.storage.from(DATA_BUCKET).download(MESSAGE_PATH);
  if (error) {
    if (isMissingStorageObject(error)) return { removed: 0, skipped: true };
    throw error;
  }

  const parsed = JSON.parse(await data.text()) as unknown;
  if (!Array.isArray(parsed)) return { removed: 0, skipped: true };

  const messages = parsed.filter((item): item is StoredBarMessage => (
    typeof item === "object" &&
    item !== null &&
    typeof (item as StoredBarMessage).id === "string" &&
    typeof (item as StoredBarMessage).name === "string" &&
    typeof (item as StoredBarMessage).text === "string" &&
    typeof (item as StoredBarMessage).createdAt === "string"
  ));
  const recentMessages = messages.filter(isRecent).slice(-MESSAGE_LIMIT);

  const upload = await admin.storage.from(DATA_BUCKET).upload(
    MESSAGE_PATH,
    new Blob([JSON.stringify(recentMessages, null, 2)], { type: "application/json" }),
    { contentType: "application/json", upsert: true },
  );
  if (upload.error) throw upload.error;
  return { removed: Math.max(0, messages.length - recentMessages.length), skipped: false };
}

async function cleanupDatabaseMessages(admin: ReturnType<typeof adminClient>) {
  const retentionCutoff = new Date(Date.now() - MESSAGE_RETENTION_MS).toISOString();
  const { count, error } = await admin
    .from("listen_bar_messages")
    .delete({ count: "exact" })
    .lt("created_at", retentionCutoff);

  if (error) {
    if (isMissingListenBarMessagesTable(error)) return { removed: 0, skipped: true };
    throw error;
  }
  return { removed: count ?? 0, skipped: false };
}

async function cleanupMessages(request: NextRequest) {
  if (!assertCronAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const admin = adminClient();
    const [database, storage] = await Promise.all([
      cleanupDatabaseMessages(admin),
      cleanupStoredMessages(admin),
    ]);
    return NextResponse.json({
      retentionHours: MESSAGE_RETENTION_HOURS,
      database,
      storage,
    });
  } catch (error) {
    return NextResponse.json({ error: String((error as { message?: string })?.message ?? error) }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return cleanupMessages(request);
}

export async function POST(request: NextRequest) {
  return cleanupMessages(request);
}
