import {
  boolean,
  index,
  int,
  json,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /** Surrogate primary key. Auto-incremented numeric value managed by the database. */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/** Atlas catalogue records. `payload` preserves every original and future source field. */
export const atlasCharacters = mysqlTable("atlas_characters", {
  id: varchar("id", { length: 128 }).primaryKey(),
  name: text("name").notNull(),
  tier: varchar("tier", { length: 32 }).notNull(),
  universe: text("universe").notNull(),
  image: text("image").notNull(),
  ranked: boolean("ranked").notNull().default(false),
  aliases: json("aliases").$type<string[]>().notNull(),
  profile: json("profile").$type<Record<string, unknown>>().notNull(),
  payload: json("payload").$type<Record<string, unknown>>().notNull(),
  active: boolean("active").notNull().default(true),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

/** Historical research remains immutable in `payload`; staleness is tracked separately. */
export const atlasResearchPairs = mysqlTable(
  "atlas_research_pairs",
  {
    pairKey: varchar("pairKey", { length: 257 }).primaryKey(),
    firstId: varchar("firstId", { length: 128 }).notNull(),
    secondId: varchar("secondId", { length: 128 }).notNull(),
    status: mysqlEnum("status", ["favored", "inconclusive"]).notNull(),
    winnerId: varchar("winnerId", { length: 128 }),
    isStale: boolean("isStale").notNull().default(false),
    specific: boolean("specific").notNull().default(false),
    payload: json("payload").$type<Record<string, unknown>>().notNull(),
    createdAt: timestamp("createdAt").defaultNow().notNull(),
    updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  },
  table => ({
    firstIdIdx: index("atlas_research_first_second_idx").on(
      table.firstId,
      table.secondId
    ),
  })
);

/** Singleton row serializes first-seed attempts and stores source research metadata/profiles. */
export const atlasState = mysqlTable("atlas_state", {
  stateKey: varchar("stateKey", { length: 64 }).primaryKey(),
  seedVersion: varchar("seedVersion", { length: 128 }).notNull(),
  initializedAt: timestamp("initializedAt"),
  researchPayload: json("researchPayload").$type<Record<
    string,
    unknown
  > | null>(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
