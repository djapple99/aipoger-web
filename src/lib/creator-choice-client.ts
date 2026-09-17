export class ChoiceRequestError extends Error {
  readonly status: number;
  constructor(message: string, status: number) { super(message); this.status = status; }
}

export function createCreatorChoiceRequestScope(userId: string, token: string) {
  const controller = new AbortController();
  let accessToken = token;
  return {
    userId,
    controller,
    updateAccessToken(nextToken: string) {
      controller.signal.throwIfAborted();
      accessToken = nextToken;
    },
    async request<T>(url: string, init: RequestInit = {}): Promise<T> {
      controller.signal.throwIfAborted();
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${accessToken}`);
      const response = await fetch(url, {
        ...init, headers, cache: "no-store",
        signal: AbortSignal.any([controller.signal, AbortSignal.timeout(20_000)]),
      });
      const payload = await response.json();
      // Aborting a request cannot undo a server write. It must, however, prevent
      // an old account's response from rendering or starting another mutation.
      controller.signal.throwIfAborted();
      if (!response.ok) throw new ChoiceRequestError(payload?.error || "Choice request failed", response.status);
      return payload as T;
    },
  };
}

export type CreatorChoiceRequestScope = ReturnType<typeof createCreatorChoiceRequestScope>;
