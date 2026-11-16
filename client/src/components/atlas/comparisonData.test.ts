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

    expect(rows.find((row) => row.label === "Força")).toMatchObject({ advantage: "first" });
    expect(rows.find((row) => row.label === "Velocidade")).toMatchObject({ advantage: "first" });
    expect(rows.find((row) => row.label === "Ataque")).toMatchObject({ advantage: null });
  });

  it("não trata dados ausentes como fraqueza nem como vantagem", () => {
    const first = character("a", { combat: { Alcance: "Ilimitado" } });
    const second = character("b", { combat: { Força: "Alta" } });
    const rows = buildComparisonRows(first, second);

    expect(rows.find((row) => row.label === "Alcance")).toMatchObject({ first: "Ilimitado", second: undefined, advantage: null });
    expect(rows.find((row) => row.label === "Força")).toMatchObject({ first: undefined, second: "Alta", advantage: null });
  });

  it("preserva igualdade e valores descritivos sem estabelecer superioridade", () => {
    const first = character("a", { mentalidade: { Inteligência: "Onisciência" }, combat: { Defesa: "Ômega (autoridade autoral)" } });
    const second = character("b", { mentalidade: { Inteligência: "Onisciência" }, combat: { Defesa: "Transcendente" } });
    const rows = buildComparisonRows(first, second);

    expect(rows.find((row) => row.label === "Inteligência")).toMatchObject({ advantage: null });
    expect(rows.find((row) => row.label === "Defesa")).toMatchObject({ advantage: null });
  });

  it("marca Onisciência sobre Altíssima em Inteligência e omite resumo e justificativa de Tier", () => {
    const darkness = character("a-grande-escuridao", {
      mentalidade: { Inteligência: "Onisciência implícita como força primordial consciente" },
      summary: "Descrição narrativa que não deve virar linha da matriz.",
      rankReason: "Justificativa de Tier que não deve virar linha da matriz.",
    });
    const wanda = character("feiticeira-escarlate", { mentalidade: { Inteligência: "Altíssima" } });
    const rows = buildComparisonRows(darkness, wanda);

    expect(rows.find((row) => row.label === "Inteligência")).toMatchObject({ advantage: "first" });
    expect(rows.some((row) => row.label === "Descrição geral" || row.label === "Justificativa de Tier")).toBe(false);
  });

  it("não interpreta pseudo-onisciência como uma vantagem comprovada", () => {
    const first = character("a", { mentalidade: { Inteligência: "Pseudo-Onisciência" } });
    const second = character("b", { mentalidade: { Inteligência: "Altíssima" } });
    const rows = buildComparisonRows(first, second);

    expect(rows.find((row) => row.label === "Inteligência")).toMatchObject({ advantage: null });
  });
});
