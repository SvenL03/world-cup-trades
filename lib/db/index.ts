import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "./schema";

/**
 * Local dev: defaults to a SQLite file (file:./local.db).
 * Production (Vercel): set TURSO_DATABASE_URL (libsql://...) and TURSO_AUTH_TOKEN.
 */
const url = process.env.TURSO_DATABASE_URL ?? "file:./local.db";
const authToken = process.env.TURSO_AUTH_TOKEN;

const client = createClient({ url, authToken });

export const db = drizzle(client, { schema });
export { schema };
