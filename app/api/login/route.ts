import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE, authToken, isAuthed, verifyPassword } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json({ authed: await isAuthed() });
}

export async function POST(req: NextRequest) {
  const { password } = (await req.json()) as { password?: string };
  if (!password || !(await verifyPassword(password)))
    return NextResponse.json({ error: "wrong password" }, { status: 401 });

  const res = NextResponse.json({ authed: true });
  // Session cookie (no maxAge) -> re-enter the password once per browser session.
  res.cookies.set(AUTH_COOKIE, await authToken(), {
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
