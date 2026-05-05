export const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

export const mockUserId =
  process.env.NEXT_PUBLIC_MOCK_USER_ID ?? "00000000-0000-0000-0000-000000000001";
