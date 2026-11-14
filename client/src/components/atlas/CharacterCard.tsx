import { ArrowUpRight, Image as ImageIcon } from "lucide-react";
import { useState } from "react";
import type { AtlasCharacter } from "./types";
import { characterInitials, tierLabel } from "./utils";

export function CharacterCard({ character, onOpen, compact = false }: { character: AtlasCharacter; onOpen: (character: AtlasCharacter) => void; compact?: boolean }) {
  const [imageFailed, setImageFailed] = useState(false);
  const tier = tierLabel(character.tier);
  return <button type="button" className={`character-card ${compact ? "character-card-compact" : ""}`} onClick={() => onOpen(character)} aria-label={`Abrir ficha de ${character.name}`}>
    <span className="card-art">
      {character.image && !imageFailed ? <img src={character.image} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} /> : <span className="art-fallback"><ImageIcon size={18} /><b>{characterInitials(character.name)}</b></span>}
      <span className={`tier-tag tier-${tier.toLowerCase()}`}>{tier === "—" ? "SEM TIER" : `TIER ${tier}`}</span>
      <span className="card-open"><ArrowUpRight size={16} /></span>
    </span>
    <span className="card-copy"><strong>{character.name}</strong><small>{character.universe || "Universo não informado"}</small></span>
  </button>;
}
