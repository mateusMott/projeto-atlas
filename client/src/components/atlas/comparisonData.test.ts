import { describe, expect, it } from "vitest";
import { buildComparisonRows } from "./comparisonData";
import type { AtlasCharacter } from "./types";

function character(id: string, profile: Record<string, unknown>): AtlasCharacter {
  return { id, name: id, tier: 1, universe: "Teste", image: "", ranked: false, profile };
}

describe("buildComparisonRows", () => {
  it("alinha atributos com o mesmo rótulo e marca vantagem somente em escalas comparáveis", () => {
    const first = character("a", { combat: { Força: "Alta", Velocidade: "200 km/s", Ataque: "Ômega" } });
    const second = character("b", { combat: { Força: "Moderada", Velocidade: "150 km/s", Ataque: "Ilimitado" } });
    const rows = buildComparisonRows(first, second);

    expect(rows.find((row) => row.label === "Força")).toMatchObject({ advantage: "first", valuesDiffer: true });
    expect(rows.find((row) => row.label === "Velocidade")).toMatchObject({ advantage: "first", valuesDiffer: true });
    expect(rows.find((row) => row.label === "Ataque")).toMatchObject({ advantage: null, valuesDiffer: true });
  });

  it("não trata dados ausentes como fraqueza nem como vantagem", () => {
    const first = character("a", { combat: { Alcance: "Ilimitado" } });
    const second = character("b", { combat: { Força: "Alta" } });
    const rows = buildComparisonRows(first, second);

    expect(rows.find((row) => row.label === "Alcance")).toMatchObject({ first: "Ilimitado", second: undefined, advantage: null, valuesDiffer: false });
    expect(rows.find((row) => row.label === "Força")).toMatchObject({ first: undefined, second: "Alta", advantage: null, valuesDiffer: false });
  });

  it("preserva igualdade e valores descritivos sem estabelecer superioridade", () => {
    const first = character("a", { mentalidade: { Inteligência: "Onisciência" }, combat: { Defesa: "Ômega (autoridade autoral)" } });
    const second = character("b", { mentalidade: { Inteligência: "Onisciência" }, combat: { Defesa: "Transcendente" } });
    const rows = buildComparisonRows(first, second);

    expect(rows.find((row) => row.label === "Inteligência")).toMatchObject({ advantage: null, valuesDiffer: false });
    expect(rows.find((row) => row.label === "Defesa")).toMatchObject({ advantage: null, valuesDiffer: true });
  });
});
