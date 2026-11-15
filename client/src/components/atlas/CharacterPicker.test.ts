import { describe, expect, it } from "vitest";
import type { AtlasCharacter } from "./types";
import { filterCharacters } from "./CharacterPicker";

function character(
  id: string,
  name: string,
  aliases: string[] = [],
  profile: Record<string, unknown> = {},
): AtlasCharacter {
  return {
    id,
    name,
    tier: "A",
    universe: "Teste",
    image: "",
    ranked: true,
    aliases,
    profile,
  };
}

describe("filterCharacters", () => {
  it("ignora maiúsculas e acentos e prioriza resultados pelo nome", () => {
    const characters = [
      character("profile", "Guardião", [], { observacao: "O poder da morte" }),
      character("alias", "Sentinela", ["A Morte"]),
      character("name", "Morte Cósmica"),
    ];

    expect(filterCharacters(characters, "MORTE").map(({ id }) => id)).toEqual([
      "name",
      "alias",
      "profile",
    ]);
  });

  it("encontra nomes e aliases mesmo quando a consulta não tem acentos", () => {
    const characters = [
      character("alias", "Lâmina Estelar", ["A Guardiã" ]),
      character("other", "Sentinela"),
    ];

    expect(filterCharacters(characters, "lamina").map(({ id }) => id)).toEqual([
      "alias",
    ]);
    expect(filterCharacters(characters, "guardia").map(({ id }) => id)).toEqual([
      "alias",
    ]);
  });

  it("pesquisa também o conteúdo da ficha", () => {
    const characters = [
      character("profile", "Viajante", [], { poderes: "Manipulação temporal" }),
      character("other", "Sentinela"),
    ];

    expect(filterCharacters(characters, "TEMPORAL").map(({ id }) => id)).toEqual([
      "profile",
    ]);
  });

  it("preserva a ordem original quando a consulta está vazia ou contém apenas espaços", () => {
    const characters = [character("first", "Primeiro"), character("second", "Segundo")];

    expect(filterCharacters(characters, "   ")).toBe(characters);
  });
});
