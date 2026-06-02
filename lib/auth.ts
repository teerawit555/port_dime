export const AUTH_COOKIE_NAME = "stockdesk_auth";

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;

function getSecret() {
  return process.env.AUTH_SECRET ?? process.env.APP_PASSWORD ?? "stockdesk-dev";
}

export function isAuthEnabled() {
  return Boolean(process.env.APP_PASSWORD);
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
  return isAuthEnabled() && password === process.env.APP_PASSWORD;
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
