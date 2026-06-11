/** 目前後台只開給 owner；公司與管理流程穩定前不吃公開 env 擴充名單。 */
const OWNER_ADMIN_EMAILS = ["djapple99@gmail.com", "aipoger99@gmail.com"];

export function getAdminEmails(): string[] {
  return OWNER_ADMIN_EMAILS;
}

export function isAdminEmail(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return getAdminEmails().includes(email.trim().toLowerCase());
}
