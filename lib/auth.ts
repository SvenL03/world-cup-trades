import { cookies } from "next/headers";

export const AUTH_COOKIE = "wct_auth";

export type Role = "editor" | "viewer";

const editorPw = () => process.env.APP_PASSWORD ?? "worldcup";
const viewerPw = () => process.env.VIEW_PASSWORD ?? "view";
const secret = () => process.env.SESSION_SECRET ?? "dev-secret-change-me";

async function sha256(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Role-specific cookie token. */
export async function authToken(role: Role): Promise<string> {
  const pw = role === "editor" ? editorPw() : viewerPw();
  return sha256(`${role}::${pw}::${secret()}`);
}

/** Map a submitted password to its role (editor checked first). */
export function roleForPassword(input: string): Role | null {
  if (input === editorPw()) return "editor";
  if (input === viewerPw()) return "viewer";
  return null;
}

/** Role carried by the current request's cookie, or null. */
export async function getRole(): Promise<Role | null> {
  const jar = await cookies();
  const token = jar.get(AUTH_COOKIE)?.value;
  if (!token) return null;
  if (token === (await authToken("editor"))) return "editor";
  if (token === (await authToken("viewer"))) return "viewer";
  return null;
}

/** Any valid session (viewer or editor) — may view. */
export async function isAuthed(): Promise<boolean> {
  return (await getRole()) !== null;
}

/** Editor session only — may make changes. */
export async function canEdit(): Promise<boolean> {
  return (await getRole()) === "editor";
}
