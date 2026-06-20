import { cookies } from "next/headers";

export const AUTH_COOKIE = "wct_auth";

const password = () => process.env.APP_PASSWORD ?? "worldcup";
const secret = () => process.env.SESSION_SECRET ?? "dev-secret-change-me";

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Token stored in the cookie after a successful login. */
export async function authToken(): Promise<string> {
  return sha256(`${password()}::${secret()}`);
}

export async function verifyPassword(input: string): Promise<boolean> {
  return input === password();
}

/** True when the request carries a valid auth cookie. */
export async function isAuthed(): Promise<boolean> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return false;
  return token === (await authToken());
}
