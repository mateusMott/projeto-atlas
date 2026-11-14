import { readFile } from "node:fs/promises";
import path from "node:path";
import { eq, or, sql } from "drizzle-orm";
import {
  atlasCharacters,
  atlasResearchPairs,
  atlasState,
} from "../../drizzle/schema";
import { getDb } from "../db";

export const ATLAS_SEED_VERSION = "atlas-2026-09-18.1";
const STATE_KEY = "atlas";
const INSERT_BATCH_SIZE = 100;

type JsonObject = Record<string, unknown>;
type CatalogSource = {
  id: string;
  name: string;
  tier: string | number | null;
  universe: string;
  image: string;
  ranked: boolean;
  aliases?: string[];
  profile: JsonObject;
  [key: string]: unknown;
};
type ResearchSource = {
  schema: number;
  edition: string;
  researchedAt: string;
  conditions: string;
  method: string;
  counts: JsonObject;
  profiles: Record<string, JsonObject>;
  pairs: Record<
    string,
    JsonObject & {
      fighters: string[];
      status: "favored" | "inconclusive";
      winnerId: string | null;
      review?: string;
    }
  >;
  [key: string]: unknown;
};

export type AtlasCharacter = {
  id: string;
  name: string;
  tier: string;
  universe: string;
  image: string;
  ranked: boolean;
  aliases: string[];
  profile: Record<string, unknown>;
  [key: string]: unknown;
};
export type ResearchProfile = Record<string, unknown>;
export type ResearchInfo = {
  edition: string;
  researchedAt: string;
  conditions: string;
  method: string;
};
export type ResearchCounts = {
  total: number;
  favored: number;
  inconclusive: number;
  stale: number;
  specific: number;
};

let sourceFilesPromise:
  | Promise<{ catalog: CatalogSource[]; research: ResearchSource }>
  | undefined;
async function readSourceFiles() {
  if (!sourceFilesPromise) {
    sourceFilesPromise = (async () => {
      const root = path.resolve(process.cwd(), "data", "atlas");
      const [catalogJson, researchJson] = await Promise.all([
        readFile(path.join(root, "catalog.json"), "utf8"),
        readFile(path.join(root, "research.json"), "utf8"),
      ]);
      return {
        catalog: JSON.parse(catalogJson) as CatalogSource[],
        research: JSON.parse(researchJson) as ResearchSource,
      };
    })();
  }
  return sourceFilesPromise;
}

function asCharacterPayload(source: CatalogSource): JsonObject {
  return {
    ...source,
    tier: source.tier == null ? "" : String(source.tier),
    aliases: source.aliases ?? [],
  };
}
function metadataOnly(source: ResearchSource): JsonObject {
  const { pairs: _pairs, ...metadata } = source;
  return metadata;
}
function pairIds(
  key: string,
  pair: ResearchSource["pairs"][string]
): [string, string] {
  const [keyFirst, keySecond] = key.split("|");
  const ids = key.includes("|") ? [keyFirst, keySecond] : pair.fighters;
  if (!ids[0] || !ids[1] || ids[0] === ids[1])
    throw new Error(`Invalid Atlas pair key: ${key}`);
  return ids[0] < ids[1] ? [ids[0], ids[1]] : [ids[1], ids[0]];
}
function isSpecific(review: unknown): boolean {
  return (
    typeof review === "string" &&
    review.toLocaleLowerCase("pt-BR").includes("específico")
  );
}

/** One transaction and a locked singleton row prevent concurrent first requests from partially seeding. */
export async function ensureAtlasSeed(): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const source = await readSourceFiles();

  await db.transaction(async tx => {
    await tx
      .insert(atlasState)
      .values({
        stateKey: STATE_KEY,
        seedVersion: ATLAS_SEED_VERSION,
        initializedAt: null,
        researchPayload: null,
      })
      .onDuplicateKeyUpdate({ set: { stateKey: STATE_KEY } });
    const stateRows = await tx
      .select()
      .from(atlasState)
      .where(eq(atlasState.stateKey, STATE_KEY))
      .for("update");
    if (stateRows[0]?.initializedAt) return;

    const [characterCountRows, pairCountRows] = await Promise.all([
      tx.select({ count: sql<number>`count(*)` }).from(atlasCharacters),
      tx.select({ count: sql<number>`count(*)` }).from(atlasResearchPairs),
    ]);
    const existingCharacters = Number(characterCountRows[0]?.count ?? 0);
    const existingPairs = Number(pairCountRows[0]?.count ?? 0);
    // Never overwrite partially provisioned or administrator-edited data.
    if (existingCharacters > 0 || existingPairs > 0) return;

    const characterRows = source.catalog.map(character => {
      const payload = asCharacterPayload(character);
      return {
        id: character.id,
        name: character.name,
        tier: character.tier == null ? "" : String(character.tier),
        universe: character.universe,
        image: character.image ?? "",
        ranked: Boolean(character.ranked),
        aliases: character.aliases ?? [],
        profile: character.profile,
        payload,
        active: true,
      };
    });
    for (
      let offset = 0;
      offset < characterRows.length;
      offset += INSERT_BATCH_SIZE
    ) {
      await tx
        .insert(atlasCharacters)
        .values(characterRows.slice(offset, offset + INSERT_BATCH_SIZE));
    }

    const pairs = Object.entries(source.research.pairs);
    if (pairs.length !== 1431 || source.catalog.length !== 54) {
      throw new Error(
        "Atlas source data does not match the expected seed edition"
      );
    }
    const pairRows = pairs.map(([sourceKey, payload]) => {
      const [firstId, secondId] = pairIds(sourceKey, payload);
      const pairKey = `${firstId}|${secondId}`;
      return {
        pairKey,
        firstId,
        secondId,
        status: payload.status,
        winnerId: payload.winnerId,
        isStale: false,
        specific: isSpecific(payload.review),
        payload,
      };
    });
    for (
      let offset = 0;
      offset < pairRows.length;
      offset += INSERT_BATCH_SIZE
    ) {
      await tx
        .insert(atlasResearchPairs)
        .values(pairRows.slice(offset, offset + INSERT_BATCH_SIZE));
    }

    await tx
      .update(atlasState)
      .set({
        seedVersion: ATLAS_SEED_VERSION,
        initializedAt: new Date(),
        researchPayload: metadataOnly(source.research),
      })
      .where(eq(atlasState.stateKey, STATE_KEY));
  });
}

function rowToCharacter(
  row: typeof atlasCharacters.$inferSelect
): AtlasCharacter {
  return {
    ...row.payload,
    id: row.id,
    name: row.name,
    tier: row.tier,
    universe: row.universe,
    image: row.image,
    ranked: row.ranked,
    aliases: row.aliases,
    profile: row.profile,
  };
}

async function readState() {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const [rows] = await Promise.all([
    db
      .select()
      .from(atlasState)
      .where(eq(atlasState.stateKey, STATE_KEY))
      .limit(1),
  ]);
  return rows[0];
}

export async function getResearchInfo(): Promise<ResearchInfo> {
  const state = await readState();
  const metadata = (state?.researchPayload ??
    (await readSourceFiles()).research) as JsonObject;
  const source = metadata as Partial<ResearchInfo>;
  return {
    edition: typeof source.edition === "string" ? source.edition : "",
    researchedAt:
      typeof source.researchedAt === "string" ? source.researchedAt : "",
    conditions: typeof source.conditions === "string" ? source.conditions : "",
    method: typeof source.method === "string" ? source.method : "",
  };
}

export async function getResearchCounts(): Promise<ResearchCounts> {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const rows = await db
    .select({
      status: atlasResearchPairs.status,
      isStale: atlasResearchPairs.isStale,
      specific: atlasResearchPairs.specific,
    })
    .from(atlasResearchPairs);
  return rows.reduce<ResearchCounts>(
    (counts, row) => {
      counts.total += 1;
      if (row.status === "favored") counts.favored += 1;
      if (row.status === "inconclusive") counts.inconclusive += 1;
      if (row.isStale) counts.stale += 1;
      if (row.specific) counts.specific += 1;
      return counts;
    },
    { total: 0, favored: 0, inconclusive: 0, stale: 0, specific: 0 }
  );
}

export async function getActiveCharacters(): Promise<AtlasCharacter[]> {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const rows = await db
    .select()
    .from(atlasCharacters)
    .where(eq(atlasCharacters.active, true));
  return rows.map(rowToCharacter);
}

export async function lookupResearch(firstId: string, secondId: string) {
  if (firstId === secondId) return null;
  const [id1, id2] =
    firstId < secondId ? [firstId, secondId] : [secondId, firstId];
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const [pair] = await db
    .select()
    .from(atlasResearchPairs)
    .where(eq(atlasResearchPairs.pairKey, `${id1}|${id2}`))
    .limit(1);
  if (!pair) return null;

  const metadata = ((await readState())?.researchPayload ??
    (await readSourceFiles()).research) as JsonObject;
  const researchProfiles = metadata.profiles as
    | Record<string, ResearchProfile>
    | undefined;
  const historical = pair.payload;
  const profiles: [ResearchProfile, ResearchProfile] = [
    researchProfiles?.[id1] ?? {},
    researchProfiles?.[id2] ?? {},
  ];
  return {
    pairKey: pair.pairKey,
    status: pair.isStale ? ("outdated" as const) : pair.status,
    winnerId: pair.isStale ? null : pair.winnerId,
    confidence:
      typeof historical.confidence === "string" ? historical.confidence : "",
    reason: typeof historical.reason === "string" ? historical.reason : "",
    counter: typeof historical.counter === "string" ? historical.counter : "",
    review: typeof historical.review === "string" ? historical.review : "",
    profiles,
    edition: typeof metadata.edition === "string" ? metadata.edition : "",
    researchedAt:
      typeof metadata.researchedAt === "string" ? metadata.researchedAt : "",
    conditions:
      typeof metadata.conditions === "string" ? metadata.conditions : "",
    method: typeof metadata.method === "string" ? metadata.method : "",
    isStale: pair.isStale,
  };
}

function stableJson(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableJson).join(",")}]`;
  if (value !== null && typeof value === "object") {
    return `{${Object.keys(value as JsonObject)
      .sort()
      .map(
        key =>
          `${JSON.stringify(key)}:${stableJson((value as JsonObject)[key])}`
      )
      .join(",")}}`;
  }
  return JSON.stringify(value);
}
function reviewRelevantProfile(profile: JsonObject): JsonObject {
  const keys = [
    "summary",
    "version",
    "mentalidade",
    "intelligence",
    "inteligencia",
    "combat",
    "attributes",
    "powers",
    "weaknesses",
    "observation",
    "observations",
    "observações",
  ];
  return Object.fromEntries(keys.map(key => [key, profile[key]]));
}

export async function saveCharacter(
  character: AtlasCharacter
): Promise<AtlasCharacter> {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const payload: JsonObject = { ...character };
  const profile = character.profile as JsonObject;
  const result = await db.transaction(async tx => {
    const [existing] = await tx
      .select()
      .from(atlasCharacters)
      .where(eq(atlasCharacters.id, character.id))
      .limit(1);
    const changedForResearch =
      existing !== undefined &&
      stableJson(reviewRelevantProfile(existing.profile)) !==
        stableJson(reviewRelevantProfile(profile));
    await tx
      .insert(atlasCharacters)
      .values({
        id: character.id,
        name: character.name,
        tier: character.tier,
        universe: character.universe,
        image: character.image,
        ranked: character.ranked,
        aliases: character.aliases,
        profile,
        payload,
        active: true,
      })
      .onDuplicateKeyUpdate({
        set: {
          name: character.name,
          tier: character.tier,
          universe: character.universe,
          image: character.image,
          ranked: character.ranked,
          aliases: character.aliases,
          profile,
          payload,
          active: true,
        },
      });
    if (changedForResearch) {
      await tx
        .update(atlasResearchPairs)
        .set({ isStale: true })
        .where(
          or(
            eq(atlasResearchPairs.firstId, character.id),
            eq(atlasResearchPairs.secondId, character.id)
          )
        );
    }
    return { ...character };
  });
  return result;
}

export async function softDeleteCharacter(id: string): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  await db
    .update(atlasCharacters)
    .set({ active: false })
    .where(eq(atlasCharacters.id, id));
}

export async function exportAtlasData() {
  const db = await getDb();
  if (!db) throw new Error("Atlas database is not available");
  const [characterRows, pairRows, state] = await Promise.all([
    db.select().from(atlasCharacters),
    db.select().from(atlasResearchPairs),
    readState(),
  ]);
  const metadata =
    state?.researchPayload ?? metadataOnly((await readSourceFiles()).research);
  const pairPayloads = Object.fromEntries(
    pairRows.map(row => [
      row.pairKey,
      {
        ...row.payload,
        pairKey: row.pairKey,
        isStale: row.isStale,
        outdated: row.isStale,
      },
    ])
  );
  const metadataObj = metadata as JsonObject;
  const sourceCounts = (metadataObj.counts ?? {}) as JsonObject;
  const counts = await getResearchCounts();
  return {
    exportedAt: new Date().toISOString(),
    characters: characterRows.map(row => ({
      ...rowToCharacter(row),
      active: row.active,
    })),
    research: {
      ...metadataObj,
      counts: {
        ...sourceCounts,
        characters: characterRows.filter(row => row.active).length,
        pairs: counts.total,
        favored: counts.favored,
        inconclusive: counts.inconclusive,
        specific: counts.specific,
        stale: counts.stale,
      },
      pairs: pairPayloads,
    },
  };
}
