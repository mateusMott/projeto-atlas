import { useQuery } from "@tanstack/react-query";
import { trpc } from "@/lib/trpc";
import type { AtlasCharacter, CatalogResponse, ResearchLookup } from "@/components/atlas/types";

export const IS_ATLAS_STATIC = import.meta.env.VITE_ATLAS_STATIC === "true";
export const ATLAS_MANUS_APP_URL = "https://atlasapp-nfsrwjx8.manus.space/";
const STATIC_DATA_BASE = `${import.meta.env.BASE_URL}atlas-static`;

type QueryResult<T> = {
  data?: T;
  isLoading: boolean;
  isError: boolean;
  error?: { message?: string } | Error | null;
  refetch: () => Promise<unknown>;
};
type CatalogApiHook = (input?: undefined, options?: { enabled?: boolean }) => QueryResult<CatalogResponse>;
type ResearchApiHook = (
  input: { firstId: string; secondId: string },
  options: { enabled: boolean },
) => QueryResult<ResearchLookup | null>;

const atlasApi = trpc as unknown as {
  atlas: {
    catalog: { useQuery: CatalogApiHook };
    research: { lookup: { useQuery: ResearchApiHook } };
  };
};

type StaticResearch = {
  edition?: string;
  researchedAt?: string;
  conditions?: string;
  method?: string;
  counts?: Record<string, number>;
  profiles?: Record<string, Record<string, unknown>>;
  pairs?: Record<string, Record<string, unknown>>;
};

async function getStaticJson<T>(file: string): Promise<T> {
  const response = await fetch(`${STATIC_DATA_BASE}/${file}`);
  if (!response.ok) throw new Error(`Não foi possível carregar ${file} (${response.status}).`);
  return response.json() as Promise<T>;
}

async function loadStaticCatalog(): Promise<CatalogResponse> {
  const [sourceCharacters, research] = await Promise.all([
    getStaticJson<AtlasCharacter[]>("catalog.json"),
    getStaticJson<StaticResearch>("research-meta.json"),
  ]);
  const characters = sourceCharacters.map((character) => ({
    ...character,
    aliases: character.aliases ?? [],
    image: character.id === "the-fulcrum"
      ? `${STATIC_DATA_BASE}/fulcrum.jpeg`
      : character.image,
  }));
  const counts = research.counts ?? {};
  return {
    characters,
    researchInfo: {
      edition: research.edition,
      researchedAt: research.researchedAt,
      conditions: research.conditions,
      method: research.method,
    },
    researchCounts: {
      total: counts.pairs ?? 0,
      favored: counts.favored ?? 0,
      inconclusive: counts.inconclusive ?? 0,
      stale: counts.stale ?? 0,
      specific: counts.specific ?? 0,
    },
  };
}

let staticResearchPromise: Promise<StaticResearch> | undefined;
function loadStaticResearch(): Promise<StaticResearch> {
  if (!staticResearchPromise) {
    staticResearchPromise = Promise.all([
      getStaticJson<Record<string, Record<string, unknown>>>("research-pairs.json"),
      getStaticJson<Omit<StaticResearch, "pairs">>("research-meta.json"),
    ]).then(([pairs, metadata]) => ({ ...metadata, pairs }));
  }
  return staticResearchPromise;
}

async function lookupStaticResearch(firstId: string, secondId: string): Promise<ResearchLookup | null> {
  if (!firstId || !secondId || firstId === secondId) return null;
  const [id1, id2] = [firstId, secondId].sort();
  const research = await loadStaticResearch();
  const pairKey = `${id1}|${id2}`;
  const pair = research.pairs?.[pairKey];
  if (!pair) return null;
  const isStale = Boolean(pair.isStale || pair.outdated || pair.status === "outdated");
  return {
    pairKey,
    status: isStale ? "outdated" : pair.status as ResearchLookup["status"],
    winnerId: isStale ? null : (pair.winnerId as string | null | undefined),
    confidence: pair.confidence,
    reason: pair.reason,
    counter: pair.counter,
    review: pair.review,
    profiles: [research.profiles?.[id1] ?? {}, research.profiles?.[id2] ?? {}],
    edition: research.edition,
    researchedAt: research.researchedAt,
    conditions: research.conditions,
    method: research.method,
    isStale,
  };
}

export function useAtlasCatalog(): QueryResult<CatalogResponse> {
  const apiQuery = atlasApi.atlas.catalog.useQuery(undefined, { enabled: !IS_ATLAS_STATIC });
  const staticQuery = useQuery({
    queryKey: ["atlas-static", "catalog"],
    queryFn: loadStaticCatalog,
    enabled: IS_ATLAS_STATIC,
    staleTime: Infinity,
  });
  if (IS_ATLAS_STATIC) {
    return {
      data: staticQuery.data,
      isLoading: staticQuery.isLoading,
      isError: staticQuery.isError,
      error: staticQuery.error,
      refetch: () => staticQuery.refetch(),
    };
  }
  return apiQuery;
}

export function useAtlasResearchLookup(
  firstId: string,
  secondId: string,
  valid: boolean,
): QueryResult<ResearchLookup | null> {
  const apiQuery = atlasApi.atlas.research.lookup.useQuery(
    { firstId, secondId },
    { enabled: valid && !IS_ATLAS_STATIC },
  );
  const staticQuery = useQuery({
    queryKey: ["atlas-static", "research", ...[firstId, secondId].sort()],
    queryFn: () => lookupStaticResearch(firstId, secondId),
    enabled: IS_ATLAS_STATIC && valid,
    staleTime: Infinity,
  });
  if (IS_ATLAS_STATIC) {
    return {
      data: staticQuery.data,
      isLoading: staticQuery.isLoading,
      isError: staticQuery.isError,
      error: staticQuery.error,
      refetch: () => staticQuery.refetch(),
    };
  }
  return apiQuery;
}
