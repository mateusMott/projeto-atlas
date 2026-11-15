import { Search } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import type { AtlasCharacter } from "./types";
import { normalizeSearch, searchText, tierLabel } from "./utils";

type Props = {
  /** Texto visível acima do campo (ex.: "PERSONAGEM A"). */
  label: string;
  ariaLabel: string;
  /** id do personagem selecionado. */
  value: string;
  /** Personagens que podem ser escolhidos neste lado. */
  characters: AtlasCharacter[];
  onChange: (id: string) => void;
};

function aliasText(character: AtlasCharacter) {
  return normalizeSearch(Array.isArray(character.aliases) ? character.aliases.join(" ") : String(character.aliases ?? ""));
}

/** Filtra por nome, aliases e conteúdo da ficha; nome e alias aparecem primeiro. */
export function filterCharacters(characters: AtlasCharacter[], query: string): AtlasCharacter[] {
  const terms = normalizeSearch(query).split(/\s+/).filter(Boolean);
  if (!terms.length) return characters;
  const scored: { character: AtlasCharacter; score: number }[] = [];
  for (const character of characters) {
    if (!terms.every((term) => searchText(character).includes(term))) continue;
    const name = normalizeSearch(character.name);
    const aliases = aliasText(character);
    const score = terms.every((term) => name.startsWith(term) || name.includes(` ${term}`)) ? 0
      : terms.every((term) => name.includes(term)) ? 1
      : terms.every((term) => name.includes(term) || aliases.includes(term)) ? 2
      : 3;
    scored.push({ character, score });
  }
  return scored.sort((a, b) => a.score - b.score).map((item) => item.character);
}

export function CharacterPicker({ label, ariaLabel, value, characters, onChange }: Props) {
  const id = useId();
  const listId = `${id}-lista`;
  const wrapRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState<string | null>(null); // null = mostrando o personagem escolhido
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);

  const selected = characters.find((character) => character.id === value);
  const selectedLabel = selected ? `${selected.name} — ${selected.universe}` : "";
  const results = useMemo(() => filterCharacters(characters, query ?? ""), [characters, query]);

  useEffect(() => {
    if (!open) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const close = () => {
    setOpen(false);
    setQuery(null);
  };
  const choose = (character: AtlasCharacter) => {
    onChange(character.id);
    close();
  };

  return <div className="duel-select">
    <span id={`${id}-rotulo`}>{label}</span>
    <div
      className="picker"
      ref={wrapRef}
      onBlur={(event) => { if (!wrapRef.current?.contains(event.relatedTarget as Node | null)) close(); }}
    >
      <Search size={15} aria-hidden="true" />
      <input
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        placeholder="Digite o nome do personagem…"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={open && results[active] ? `${id}-op-${active}` : undefined}
        value={query ?? selectedLabel}
        onFocus={(event) => { event.currentTarget.select(); setOpen(true); setActive(0); }}
        onChange={(event) => { setQuery(event.target.value); setOpen(true); setActive(0); }}
        onKeyDown={(event) => {
          if (event.key === "ArrowDown") { event.preventDefault(); setOpen(true); setActive((index) => Math.min(index + 1, Math.max(results.length - 1, 0))); }
          else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => Math.max(index - 1, 0)); }
          else if (event.key === "Enter" && open && results[active]) { event.preventDefault(); choose(results[active]); }
          else if (event.key === "Escape" && open) { event.preventDefault(); close(); }
        }}
      />
      {open && <ul className="picker-list" role="listbox" id={listId} ref={listRef} aria-labelledby={`${id}-rotulo`}>
        {results.length === 0 && <li className="picker-empty" role="presentation">Nenhum personagem encontrado.</li>}
        {results.map((character, index) => <li
          key={character.id}
          id={`${id}-op-${index}`}
          data-index={index}
          role="option"
          aria-selected={character.id === value}
          className={`picker-option ${index === active ? "active" : ""}`}
          onMouseDown={(event) => event.preventDefault()}
          onMouseEnter={() => setActive(index)}
          onClick={() => choose(character)}
        >
          <strong>{character.name}</strong>
          <small>{character.universe} · Tier {tierLabel(character.tier)}</small>
        </li>)}
      </ul>}
    </div>
  </div>;
}
