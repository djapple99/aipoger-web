import { bibleShareImage } from "@/lib/bible-share-image";
export const runtime = "nodejs";
export async function GET() { return bibleShareImage("One idea. Your next track.", "PROMPTS / LYRICS / SOUND / RELEASE"); }
