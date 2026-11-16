import type { AtlasCharacter } from "./types";
import { displayValue, normalizeSearch, profileField } from "./utils";

export type ComparisonRow = {
  key: string;
  group: string;
  label: string;
  first: unknown;
  second: unknown;
  advantage: "first" | "second" | null;
  valuesDiffer: boolean;
};

type DraftRow = Pick<ComparisonRow, "key" | "group" | "label"> & {
  first?: unknown;
  second?: unknown;
  hasFirst: boolean;
  hasSecond: boolean;
};

function hasValue(value: unknown): boolean {
  return value !== undefined && value !== null && value !== "";
}

function addValue(rows: DraftRow[], group: string, label: string, value: unknown) {
  if (!hasValue(value)) return;
  if (typeof value === "object" && !Array.isArray(value)) {
    for (const [field, item] of Object.entries(value as Record<string, unknown>)) {
      if (hasValue(item)) rows.push({ key: normalizeSearch(field), group, label: field, first: item, second: undefined, hasFirst: false, hasSecond: false });
    }
    return;
  }
  rows.push({ key: normalizeSearch(label), group, label, first: value, second: undefined, hasFirst: false, hasSecond: false });
}

function characterFields(character: AtlasCharacter): DraftRow[] {
  const profile = character.profile ?? {};
  const rows: DraftRow[] = [];
  addValue(rows, "GERAL", "Descrição geral", profileField(profile, "summary", "resumo"));
  addValue(rows, "GERAL", "Justificativa de Tier", profileField(profile, "rankReason", "tierReason", "justificativa"));
  addValue(rows, "MENTALIDADE", "Mentalidade", profileField(profile, "mentalidade", "mentality"));
  addValue(rows, "COMBATE", "Atributos de combate", profileField(profile, "combat", "attributes"));
  addValue(rows, "RECURSOS E LIMITES", "Poderes", profileField(profile, "powers", "poderes"));
  addValue(rows, "RECURSOS E LIMITES", "Fraquezas", profileField(profile, "weaknesses", "fraquezas"));
  addValue(rows, "RECURSOS E LIMITES", "Observações", profileField(profile, "observations", "observation", "observacoes", "observações"));
  addValue(rows, "RECURSOS E LIMITES", "Versão considerada", profileField(profile, "version", "versao", "versão"));
  return rows;
}

function comparableNumber(value: unknown): { value: number; unit: string } | null {
  if (typeof value === "number" && Number.isFinite(value)) return { value, unit: "" };
  if (typeof value !== "string") return null;
  const match = value.trim().match(/^([+-]?(?:\d+(?:[.,]\d+)?|[.,]\d+))\s*([^\d]*)$/);
  if (!match) return null;
  const parsed = Number(match[1].replace(",", "."));
  if (!Number.isFinite(parsed)) return null;
  return { value: parsed, unit: normalizeSearch(match[2].trim()).replace(/\s+/g, " ") };
}

const QUALITATIVE_SCALE: Record<string, number> = {
  "muito baixa": 0,
  baixa: 1,
  moderada: 2,
  media: 2,
  alta: 3,
  "muito alta": 4,
  altissima: 5,
  extrema: 6,
};

function comparableRank(value: unknown): number | null {
  if (typeof value !== "string") return null;
  const normalized = normalizeSearch(value).trim().replace(/[.!]/g, "").replace(/\s+/g, " ");
  return Object.prototype.hasOwnProperty.call(QUALITATIVE_SCALE, normalized) ? QUALITATIVE_SCALE[normalized] : null;
}

function determineAdvantage(first: unknown, second: unknown): "first" | "second" | null {
  const firstNumber = comparableNumber(first);
  const secondNumber = comparableNumber(second);
  if (firstNumber && secondNumber && firstNumber.unit === secondNumber.unit) {
    return firstNumber.value === secondNumber.value ? null : firstNumber.value > secondNumber.value ? "first" : "second";
  }
  const firstRank = comparableRank(first);
  const secondRank = comparableRank(second);
  if (firstRank !== null && secondRank !== null && firstRank !== secondRank) return firstRank > secondRank ? "first" : "second";
  return null;
}

export function buildComparisonRows(first: AtlasCharacter, second: AtlasCharacter): ComparisonRow[] {
  const combined = new Map<string, DraftRow>();
  for (const [side, character] of [["first", first], ["second", second]] as const) {
    for (const field of characterFields(character)) {
      const mapKey = `${field.group}\u0000${field.key}`;
      const existing = combined.get(mapKey) ?? { ...field, first: undefined, second: undefined, hasFirst: false, hasSecond: false };
      if (side === "first") {
        existing.first = field.first;
        existing.hasFirst = true;
      } else {
        existing.second = field.first;
        existing.hasSecond = true;
      }
      combined.set(mapKey, existing);
    }
  }

  return [...combined.values()].map((row) => {
    const bothPresent = row.hasFirst && row.hasSecond;
    const valuesDiffer = bothPresent && normalizeSearch(displayValue(row.first)) !== normalizeSearch(displayValue(row.second));
    return {
      key: row.key,
      group: row.group,
      label: row.label,
      first: row.hasFirst ? row.first : undefined,
      second: row.hasSecond ? row.second : undefined,
      advantage: bothPresent ? determineAdvantage(row.first, row.second) : null,
      valuesDiffer,
    };
  });
}
