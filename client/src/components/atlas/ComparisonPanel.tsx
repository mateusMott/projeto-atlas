import { useAtlasResearchLookup } from "@/lib/atlasData";
import { ArrowLeftRight, ExternalLink, Image as ImageIcon, LoaderCircle, Swords } from "lucide-react";
import { Fragment, useEffect, useMemo, useState } from "react";
import { CharacterPicker } from "./CharacterPicker";
import { buildComparisonRows } from "./comparisonData";
import type { AtlasCharacter } from "./types";
import { characterInitials, displayValue, profileField, stablePairAvailable, tierLabel } from "./utils";

function SavedProfile({ label, value }: { label: string; value: unknown }) {
  if (!value || typeof value !== "object") return null;
  const profile = value as Record<string, unknown>;
  const fields: [string, string][] = [["Versão considerada", "version"], ["Evidências", "evidence"], ["Possível caminho", "approach"], ["Limites", "limit"], ["Divergências", "divergence"]];
  const sources = profile.sources;
  const useful = fields.some(([, key]) => profile[key] !== undefined) || (Array.isArray(sources) && sources.length > 0);
  if (!useful) return null;
  return <article className="research-profile"><h4>{label}</h4>{fields.map(([title, key]) => profile[key] !== undefined && <div className="research-note" key={key}><b>{title}</b><p>{displayValue(profile[key])}</p></div>)}
    {Array.isArray(sources) && sources.length > 0 && <div className="research-note"><b>Fontes</b><ul className="source-list">{sources.map((source, index) => { const item = source as Record<string, unknown>; const url = typeof item.url === "string" ? item.url : ""; return <li key={`${url}-${index}`}>{url ? <a href={url} target="_blank" rel="noreferrer">{displayValue(item.title ?? url)} <ExternalLink size={13} /></a> : displayValue(source)}{item.access ? <small>{displayValue(item.access)}</small> : null}</li>; })}</ul></div>}</article>;
}

function MatchupCharacterCard({ character, onOpenCharacter }: { character: AtlasCharacter; onOpenCharacter: (character: AtlasCharacter) => void }) {
  const [imageFailed, setImageFailed] = useState(false);
  const summary = profileField(character.profile, "summary", "resumo");
  const tier = tierLabel(character.tier);
  const universe = character.universe || "Universo não informado";

  return <article className="matchup-card-shell">
    <button type="button" className="matchup-card" onClick={() => onOpenCharacter(character)} aria-label={`Abrir ficha de ${character.name}`}>
      <span className="matchup-card-art" aria-hidden="true">
        {character.image && !imageFailed
          ? <img src={character.image} alt="" loading="lazy" decoding="async" onError={() => setImageFailed(true)} />
          : <span className="matchup-art-fallback"><ImageIcon size={22} /><b>{characterInitials(character.name)}</b><small>Imagem não disponível</small></span>}
      </span>
      <span className="matchup-card-copy">
        <span className="matchup-card-eyebrow">Tier {tier} <span aria-hidden="true">·</span> {universe}</span>
        <strong className="matchup-card-name">{character.name}</strong>
        <span className="matchup-card-summary">{displayValue(summary)}</span>
      </span>
    </button>
  </article>;
}

function ComparisonMatrix({ first, second, onOpenCharacter }: { first: AtlasCharacter; second: AtlasCharacter; onOpenCharacter: (character: AtlasCharacter) => void }) {
  const rows = useMemo(() => buildComparisonRows(first, second), [first, second]);
  const groups = useMemo(() => [...new Set(rows.map((row) => row.group))], [rows]);

  return <section className="comparison-sheet" aria-labelledby="comparison-sheet-title">
    <div className="comparison-sheet-heading">
      <div><span className="comparison-sheet-kicker">FICHAS LADO A LADO</span><h3 id="comparison-sheet-title">Atributos em perspectiva</h3></div>
      <p>Os valores vêm das fichas do Atlas. “Vantagem” aparece em amarelo somente quando os valores têm uma escala comparável conhecida; diferenças descritivas não determinam vencedor.</p>
    </div>
    {rows.length > 0 ? <div className="compare-matrix-wrap">
      <table className="compare-matrix" aria-label={`Ficha comparativa de ${first.name} e ${second.name}`}>
        <thead><tr>
          {[first, null, second].map((character, index) => <th key={character?.id ?? "attribute-heading"} scope="col" className={character ? "compare-character-column" : "compare-attribute-heading"}>
            {character ? <button type="button" className="compare-character-button" onClick={() => onOpenCharacter(character)}>
              <span className="compare-character-index">0{index === 0 ? 1 : 2}</span>
              <span className="compare-character-copy"><strong>{character.name}</strong><small>{character.universe || "Universo não informado"} · Tier {tierLabel(character.tier)}</small></span>
            </button> : <span>ATRIBUTO</span>}
          </th>)}
        </tr></thead>
        <tbody>{groups.map((group) => <Fragment key={group}>
          <tr className="compare-group-row"><th colSpan={3} scope="rowgroup">{group}</th></tr>
          {rows.filter((row) => row.group === group).map((row) => {
            return <tr className="compare-data-row" key={`${row.group}-${row.key}`}>
              <td className={`compare-value-cell${row.advantage === "first" ? " possible-advantage" : ""}`} data-character={first.name}>
                <span className="compare-value">{displayValue(row.first)}</span>{row.advantage === "first" && <small className="compare-value-note">Vantagem</small>}
              </td>
              <th scope="row" className="compare-attribute-name">{row.label}</th>
              <td className={`compare-value-cell${row.advantage === "second" ? " possible-advantage" : ""}`} data-character={second.name}>
                <span className="compare-value">{displayValue(row.second)}</span>{row.advantage === "second" && <small className="compare-value-note">Vantagem</small>}
              </td>
            </tr>;
          })}
        </Fragment>)}</tbody>
      </table>
    </div> : <p className="muted-copy">As fichas não têm atributos comparáveis cadastrados.</p>}
  </section>;
}

export function ComparisonPanel({ characters, onOpenCharacter }: { characters: AtlasCharacter[]; onOpenCharacter: (character: AtlasCharacter) => void }) {
  const firstRanked = characters.find((character) => character.ranked) ?? characters[0];
  const [firstId, setFirstId] = useState(firstRanked?.id ?? "");
  const [secondId, setSecondId] = useState(characters.find((character) => character.id !== firstRanked?.id)?.id ?? "");
  const [submittedPairKey, setSubmittedPairKey] = useState<string | null>(null);

  useEffect(() => {
    if (!characters.length) return;
    const first = characters.find((character) => character.id === firstId);
    const second = characters.find((character) => character.id === secondId && character.id !== first?.id);
    if (!first) setFirstId((characters.find((character) => character.ranked) ?? characters[0]).id);
    if (!second) setSecondId(characters.find((character) => character.id !== (first?.id ?? firstId))?.id ?? "");
  }, [characters, firstId, secondId]);

  useEffect(() => {
    setSubmittedPairKey(null);
  }, [firstId, secondId]);

  const first = useMemo(() => characters.find((character) => character.id === firstId), [characters, firstId]);
  const second = useMemo(() => characters.find((character) => character.id === secondId), [characters, secondId]);
  const valid = stablePairAvailable(first, second);
  const pairKey = JSON.stringify([firstId, secondId]);
  const submitted = valid && submittedPairKey === pairKey;
  const lookup = useAtlasResearchLookup(firstId, secondId, submitted);
  const result = lookup.data;
  const stale = Boolean(result && (result.isStale || result.status === "outdated"));
  const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
  const winner = !stale && result?.status === "favored" ? characters.find((character) => character.id === result.winnerId) : undefined;

  return <section className="comparison-view" aria-labelledby="comparison-title">
    <div className="section-kicker"><span>02 / LEITURA CRUZADA</span><span>SEM SIMULAÇÃO</span></div>
    <div className="section-title-row"><div><h1 id="comparison-title">Quem venceria?</h1><p>Consulte apenas pareceres já registrados no Atlas.</p></div><div className="saved-counter"><b>01</b><span>duelo<br />em análise</span></div></div>
    <div className="duel-selectors">
      <CharacterPicker label="PERSONAGEM A" ariaLabel="Buscar primeiro personagem" value={firstId} characters={characters.filter((character) => character.id !== secondId)} onChange={(id) => { setSubmittedPairKey(null); setFirstId(id); }} />
      <button type="button" className="swap-button" onClick={() => { setSubmittedPairKey(null); setFirstId(secondId); setSecondId(firstId); }} disabled={!first || !second} aria-label="Trocar lados"><ArrowLeftRight size={19} /></button>
      <CharacterPicker label="PERSONAGEM B" ariaLabel="Buscar segundo personagem" value={secondId} characters={characters.filter((character) => character.id !== firstId)} onChange={(id) => { setSubmittedPairKey(null); setSecondId(id); }} />
    </div>
    {!valid && <div className="inline-alert" role="status">Escolha dois personagens diferentes para consultar o arquivo.</div>}
    <div className="compare-action-row">
      <button type="button" className="compare-action-button" onClick={() => { if (valid) setSubmittedPairKey(pairKey); }} disabled={!valid} aria-pressed={submitted}>
        Comparar personagens
      </button>
    </div>
    {submitted && first && second && <div className="compare-results" aria-live="polite">
      <div className="matchup-preview" role="group" aria-label={`Confronto entre ${first.name} e ${second.name}`}>
        <MatchupCharacterCard character={first} onOpenCharacter={onOpenCharacter} />
        <span className="matchup-vs" aria-hidden="true">VS</span>
        <MatchupCharacterCard character={second} onOpenCharacter={onOpenCharacter} />
      </div>
      <section className="verdict-panel" aria-label="Parecer salvo do confronto">
        <div className="verdict-label"><Swords size={15} /> PARECER SALVO</div>
        {lookup.isLoading ? <div className="verdict-message"><LoaderCircle className="spin" size={20} /> Consultando o arquivo de análises…</div>
          : lookup.isError ? <div className="inline-alert error" role="alert">Não foi possível consultar o parecer{lookup.error?.message ? `: ${lookup.error.message}` : ". Tente novamente."}</div>
          : !result ? <div className="verdict-message"><span className="verdict-symbol">?</span><div><h3>Sem análise registrada</h3><p>Este par ainda não tem um parecer salvo no Atlas. Nenhum vencedor será inferido.</p></div></div>
          : stale ? <div className="verdict-message verdict-stale"><span className="verdict-symbol">↻</span><div><h3>Parecer desatualizado</h3><p>Não há parecer atual válido para esta dupla. O registro existente aguarda revisão após mudanças nas fichas.</p></div></div>
          : result.status === "inconclusive" ? <div className="verdict-message"><span className="verdict-symbol">≈</span><div><h3>Inconclusivo</h3><p>O arquivo não estabelece um vencedor para este confronto. A conclusão permanece inconclusiva.</p></div></div>
          : result.status === "favored" ? <div className="verdict-message verdict-favored"><span className="verdict-symbol">↗</span><div><h3>{winner ? `${winner.name} — favorito no parecer salvo` : "Favorito no parecer salvo"}</h3><p>{displayValue(result.reason)}</p></div></div>
          : <div className="verdict-message verdict-unknown"><span className="verdict-symbol">?</span><div><h3>Estado do parecer não reconhecido</h3><p>O registro salvo não tem um estado válido conhecido. Nenhum vencedor será apresentado.</p></div></div>}
        {result && !stale && <>
          {result.reason && result.status === "inconclusive" && <div className="saved-evidence"><b>Por que não há conclusão</b><p>{displayValue(result.reason)}</p></div>}
          {result.counter && <div className="saved-evidence"><b>Contraponto registrado</b><p>{displayValue(result.counter)}</p></div>}
          {result.conditions && <div className="saved-evidence"><b>Condições do parecer</b><p>{displayValue(result.conditions)}</p></div>}
          {result.method && <div className="saved-evidence"><b>Método</b><p>{displayValue(result.method)}</p></div>}
          {profiles.map((value, index) => { const profile = value as Record<string, unknown>; const id = typeof profile.id === "string" ? profile.id : String(index); const character = characters.find((item) => item.id === id) ?? (index === 0 ? first : second); return <SavedProfile key={id} label={character?.name ?? id} value={value} />; })}
        </>}
      </section>
      <ComparisonMatrix first={first} second={second} onOpenCharacter={onOpenCharacter} />
    </div>}
  </section>;
}
