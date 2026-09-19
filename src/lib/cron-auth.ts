import type { NextRequest } from "next/server";

type CronAuthorization =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

function configuredCronSecret() {
  return process.env.CRON_SECRET?.trim() ?? "";
}

function bearerToken(request: NextRequest) {
  const authorization = request.headers.get("authorization") ?? "";
  return authorization.startsWith("Bearer ") ? authorization.slice("Bearer ".length).trim() : "";
}

export function authorizeCronRequest(request: NextRequest): CronAuthorization {
  const secret = configuredCronSecret();
  if (!secret) {
    // Keep local development convenient, but fail closed in deployed builds.
    return process.env.NODE_ENV === "production"
      ? { ok: false, status: 503, error: "CRON_SECRET is not configured" }
      : { ok: true };
  }

  return bearerToken(request) === secret
    ? { ok: true }
    : { ok: false, status: 401, error: "Unauthorized" };
}

export function hasValidCronSecret(request: NextRequest) {
  const secret = configuredCronSecret();
  return Boolean(secret && bearerToken(request) === secret);
}
