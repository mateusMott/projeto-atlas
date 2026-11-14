import { ChevronDown, ChevronRight } from "lucide-react";
import { useState } from "react";
import type { AtlasCharacter } from "./types";
import { TIER_ORDER, tierLabel } from "./utils";
import { CharacterCard } from "./CharacterCard";

export function TierSections({ characters, onOpen, focusTier }: { characters: AtlasCharacter[]; onOpen: (character: AtlasCharacter) => void; focusTier?: string | null }) {
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ S: true, A: true, B: true, C: true, D: true });
  const groups = TIER_ORDER.map((tier) => ({ tier, items: characters.filter((character) => character.ranked && tierLabel(character.tier) === tier) })).filter((group) => group.items.length > 0);
  return <div className="tier-list">
    {groups.map(({ tier, items }) => {
      const isExpanded = focusTier === tier || expanded[tier] !== false;
      return <section className={`tier-section tier-section-${tier.toLowerCase()}`} key={tier} aria-labelledby={`tier-${tier}`}>
        <button type="button" className="tier-heading" onClick={() => setExpanded((current) => ({ ...current, [tier]: !isExpanded }))} aria-expanded={isExpanded}>
          <span className={`tier-mark tier-${tier.toLowerCase()}`}>{tier}</span><span className="tier-name" id={`tier-${tier}`}>Tier {tier}</span><span className="tier-rule" /><span className="tier-count">{items.length} {items.length === 1 ? "personagem" : "personagens"}</span>{isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </button>
        {isExpanded && <div className="character-grid">{items.map((character) => <CharacterCard key={character.id} character={character} onOpen={onOpen} />)}</div>}
      </section>;
    })}
    {groups.length === 0 && <div className="empty-state"><span className="empty-glyph">∅</span><h3>Nenhum personagem neste recorte</h3><p>Tente outra busca ou limpe os filtros para ver o ranking.</p></div>}
  </div>;
}
