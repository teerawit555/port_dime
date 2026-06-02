export const AUTH_COOKIE_NAME = "stockdesk_auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
const FALLBACK_PASSWORD_HASH =
  "33eb62de9d5b3df8fe6e3ad9384cc7611ecc73d301f35d5b8f680475f1080b05";

function getSecret() {
  return (
    process.env.AUTH_SECRET ??
    process.env.APP_PASSWORD ??
    process.env.APP_PASSWORD_SHA256 ??
    FALLBACK_PASSWORD_HASH
  );
}

export function isAuthEnabled() {
  return Boolean(
    process.env.APP_PASSWORD ??
      process.env.APP_PASSWORD_SHA256 ??
      FALLBACK_PASSWORD_HASH
  );
}

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function createAuthToken() {
  return sha256(`${process.env.APP_PASSWORD}:${getSecret()}`);
}

export async function verifyPassword(password: string) {
  if (!isAuthEnabled()) return false;
  if (process.env.APP_PASSWORD) return password === process.env.APP_PASSWORD;

  const expectedHash = process.env.APP_PASSWORD_SHA256 ?? FALLBACK_PASSWORD_HASH;
  return (await sha256(password)) === expectedHash;
}

export function authCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  };
}
