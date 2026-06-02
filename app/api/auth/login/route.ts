import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createAuthToken,
  isAuthEnabled,
  verifyPassword,
} from "@/lib/auth";

export async function POST(request: Request) {
  if (!isAuthEnabled()) {
    return Response.json({ ok: true, disabled: true });
  }

  const body = (await request.json().catch(() => null)) as {
    password?: string;
  } | null;

  if (!(await verifyPassword(body?.password ?? ""))) {
    return Response.json(
      { ok: false, message: "รหัสผ่านไม่ถูกต้อง" },
      { status: 401 }
    );
  }

  const response = Response.json({ ok: true });
  response.headers.append(
    "Set-Cookie",
    `${AUTH_COOKIE_NAME}=${await createAuthToken()}; Path=/; Max-Age=${
      authCookieOptions().maxAge
    }; HttpOnly; SameSite=Lax${
      authCookieOptions().secure ? "; Secure" : ""
    }`
  );
  return response;
}
