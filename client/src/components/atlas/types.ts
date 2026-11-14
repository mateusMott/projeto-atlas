export type AtlasCharacter = {
  id: string;
  name: string;
  tier: number | string | null;
  universe: string;
  image: string;
  ranked: boolean;
  aliases?: string[] | string;
  profile: Record<string, unknown>;
  sourceUrl?: string;
  [key: string]: unknown;
};

export type ResearchInfo = {
  edition?: string;
  researchedAt?: string;
  conditions?: string;
  method?: string;
};

export type ResearchCounts = {
  total: number;
  favored: number;
  inconclusive: number;
  stale: number;
  specific: number;
};

export type CatalogResponse = {
  characters: AtlasCharacter[];
  researchInfo: ResearchInfo;
  researchCounts: ResearchCounts;
};

export type ResearchLookup = {
  pairKey: string;
  status: "favored" | "inconclusive" | "outdated";
  winnerId?: string | null;
  confidence?: unknown;
  reason?: unknown;
  counter?: unknown;
  review?: unknown;
  profiles?: unknown;
  edition?: string;
  researchedAt?: string;
  conditions?: unknown;
  method?: unknown;
  isStale?: boolean;
};
