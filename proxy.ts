import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME, createAuthToken, isAuthEnabled } from "@/lib/auth";

const PUBLIC_PATH_PREFIXES = [
  "/login",
  "/api/auth/login",
  "/api/auth/logout",
  "/favicon.ico",
];

function isPublicPath(pathname: string) {
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function proxy(request: NextRequest) {
  if (!isAuthEnabled()) return NextResponse.next();

  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const expectedToken = await createAuthToken();
  if (token === expectedToken) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp)$).*)"],
};
