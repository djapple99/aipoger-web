export const isAuthBypassEnabled = process.env.NEXT_PUBLIC_AUTH_BYPASS === "true";

export const mockUserId =
  process.env.NEXT_PUBLIC_MOCK_USER_ID ?? "00000000-0000-0000-0000-000000000001";

/** 配對頁「跳過配對」在 AUTH_BYPASS 時用的假 battles.id（不寫 DB，擂台頁以 URL + mock 資料渲染） */
export const mockSkipMatchBattleId = "mock-test-arena";
