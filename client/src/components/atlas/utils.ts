import type { AtlasCharacter } from "./types";

export const TIER_ORDER = ["S", "A", "B", "C", "D"] as const;
export type TierLabel = (typeof TIER_ORDER)[number];

export function normalizeSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR");
}

export function tierLabel(value: unknown): TierLabel | "—" {
  if (typeof value === "number" || (typeof value === "string" && /^\d+$/.test(value))) {
    const n = Number(value);
    return ({ 1: "S", 2: "A", 3: "B", 4: "C", 5: "D" } as Record<number, TierLabel>)[n] ?? "—";
  }
  const normalized = String(value ?? "").trim().toUpperCase().replace(/^TIER\s*/, "");
  return (TIER_ORDER as readonly string[]).includes(normalized) ? (normalized as TierLabel) : "—";
}

export function searchText(character: AtlasCharacter): string {
  const aliases = Array.isArray(character.aliases)
    ? character.aliases.join(" ")
    : String(character.aliases ?? "");
  let profile = "";
  try {
    profile = JSON.stringify(character.profile ?? {});
  } catch {
    profile = "";
  }
  return normalizeSearch(`${character.name} ${aliases} ${character.universe} ${profile}`);
}

export function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "Não informado na ficha.";
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.length ? value.map(displayValue).join(" · ") : "Não informado na ficha.";
  return Object.entries(value as Record<string, unknown>)
    .map(([key, item]) => `${key}: ${displayValue(item)}`)
    .join(" · ") || "Não informado na ficha.";
}

export function profileField(profile: Record<string, unknown> | undefined, ...names: string[]) {
  if (!profile) return undefined;
  for (const name of names) if (profile[name] !== undefined && profile[name] !== null && profile[name] !== "") return profile[name];
  return undefined;
}

export function stablePairAvailable(first?: AtlasCharacter, second?: AtlasCharacter) {
  return Boolean(first?.id && second?.id && first.id !== second.id);
}

export function characterInitials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0] ?? "").join("").toUpperCase();
}

export function makeCharacterId(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `personagem-${Date.now()}`;
}
