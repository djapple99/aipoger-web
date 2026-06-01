/** 內建管理員信箱；可再加 NEXT_PUBLIC_ADMIN_EMAILS= a@x.com,b@y.com */
import { AIPOGER_CONTACT_EMAIL } from "@/lib/brand";

const BUILTIN_ADMIN_EMAILS = [AIPOGER_CONTACT_EMAIL, "djapple99@gmail.com"];

export function getAdminEmails(): string[] {
  const fromEnv =
    process.env.NEXT_PUBLIC_ADMIN_EMAILS?.split(",").map((e) => e.trim().toLowerCase()).filter(Boolean) ??
    [];
  return [...new Set([...BUILTIN_ADMIN_EMAILS.map((e) => e.toLowerCase()), ...fromEnv])];
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
