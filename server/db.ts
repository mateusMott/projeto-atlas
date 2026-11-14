import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.warn(
        "[Database] Failed to connect:",
        error instanceof Error ? error.message : "unknown error"
      );
      _db = null;
    }
  }
  return _db;
}

function normalizeEmail(email: string | null | undefined): string {
  return email?.trim().toLocaleLowerCase("en-US") ?? "";
}

export function buildUserUpsertPlan(
  user: InsertUser,
  allowlistedEmailInput: string | null | undefined
) {
  const email = user.email ?? null;
  const allowlistedEmail = normalizeEmail(allowlistedEmailInput);
  const role: InsertUser["role"] =
    allowlistedEmail && normalizeEmail(email) === allowlistedEmail
      ? "admin"
      : "user";
  const lastSignedIn = user.lastSignedIn ?? new Date();
  const values: InsertUser = {
    openId: user.openId,
    name: user.name ?? null,
    email,
    loginMethod: user.loginMethod ?? null,
    lastSignedIn,
    role,
  };

  // An omitted identity field is a partial session heartbeat, not a new identity.
  // Preserve stored values and role; an explicit email (including null) recomputes role.
  const updates: Partial<InsertUser> = { lastSignedIn };
  if (user.name !== undefined) updates.name = user.name ?? null;
  if (user.email !== undefined) {
    updates.email = email;
    updates.role = role;
  }
  if (user.loginMethod !== undefined)
    updates.loginMethod = user.loginMethod ?? null;

  return { values, updates };
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  try {
    const { values, updates } = buildUserUpsertPlan(user, ENV.atlasAdminEmail);
    await db
      .insert(users)
      .values(values)
      .onDuplicateKeyUpdate({ set: updates });
  } catch (error) {
    console.error(
      "[Database] Failed to upsert user:",
      error instanceof Error ? error.message : "unknown error"
    );
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db
    .select()
    .from(users)
    .where(eq(users.openId, openId))
    .limit(1);

  return result.length > 0 ? result[0] : undefined;
}
