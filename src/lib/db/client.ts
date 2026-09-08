import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

// Cached on `globalThis` in development so Next.js's hot-reload doesn't open a
// fresh connection pool on every module re-evaluation (same pattern commonly
// used for Prisma; here it's the underlying postgres.js connection).
declare global {
  var __postgresClient: ReturnType<typeof postgres> | undefined;
}

function createClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is not set — copy .env.example to .env and configure it.",
    );
  }
  return postgres(connectionString, {
    max: process.env.NODE_ENV === "production" ? 10 : 1,
  });
}

const client = globalThis.__postgresClient ?? createClient();
if (process.env.NODE_ENV !== "production") {
  globalThis.__postgresClient = client;
}

export const db = drizzle(client, { schema });
