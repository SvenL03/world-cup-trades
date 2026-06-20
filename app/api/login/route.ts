import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authToken, getRole, roleForPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  const role = await getRole();
  return NextResponse.json({ authed: role !== null, role, canEdit: role === "editor" });
}

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  const role = password ? roleForPassword(password) : null;
  if (!role)
    return NextResponse.json({ error: "wrong password" }, { status: 401 });

  const res = NextResponse.json({ authed: true, role, canEdit: role === "editor" });
  // Session cookie (no maxAge) -> re-enter the password once per browser session.
  res.cookies.set(AUTH_COOKIE, await authToken(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ authed: false });
  res.cookies.delete(AUTH_COOKIE);
  return res;
}
