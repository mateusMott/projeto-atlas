import { useAtlasResearchLookup } from "@/lib/atlasData";
import { ArrowLeftRight, ExternalLink, LoaderCircle, Swords } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CharacterPicker } from "./CharacterPicker";
import type { AtlasCharacter } from "./types";
import { displayValue, profileField, stablePairAvailable, tierLabel } from "./utils";

function KeyValue({ label, value }: { label: string; value: unknown }) {
  return <div className="compare-stat"><span>{label}</span><strong>{displayValue(value)}</strong></div>;
}

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

function ComparisonAttributes({ character }: { character: AtlasCharacter }) {
  const combat = (profileField(character.profile, "combat", "attributes") ?? {}) as Record<string, unknown>;
  const pairs: [string, unknown][] = [["Inteligência", profileField(character.profile, "mentalidade", "mentality")], ...Object.entries(combat)];
  return <div className="compare-attributes">{pairs.length ? pairs.map(([label, value]) => <KeyValue key={label} label={label} value={value} />) : <p className="muted-copy">Atributos não informados.</p>}</div>;
}

export function ComparisonPanel({ characters, onOpenCharacter }: { characters: AtlasCharacter[]; onOpenCharacter: (character: AtlasCharacter) => void }) {
  const firstRanked = characters.find((character) => character.ranked) ?? characters[0];
  const [firstId, setFirstId] = useState(firstRanked?.id ?? "");
  const [secondId, setSecondId] = useState(characters.find((character) => character.id !== firstRanked?.id)?.id ?? "");
  useEffect(() => {
    if (!characters.length) return;
    const first = characters.find((character) => character.id === firstId);
    const second = characters.find((character) => character.id === secondId && character.id !== first?.id);
    if (!first) setFirstId((characters.find((character) => character.ranked) ?? characters[0]).id);
    if (!second) setSecondId(characters.find((character) => character.id !== (first?.id ?? firstId))?.id ?? "");
  }, [characters, firstId, secondId]);
  const first = useMemo(() => characters.find((character) => character.id === firstId), [characters, firstId]);
  const second = useMemo(() => characters.find((character) => character.id === secondId), [characters, secondId]);
  const valid = stablePairAvailable(first, second);
  const lookup = useAtlasResearchLookup(firstId, secondId, valid);
  const result = lookup.data;
  const stale = Boolean(result && (result.isStale || result.status === "outdated"));
  const profiles = Array.isArray(result?.profiles) ? result.profiles : [];
  const winner = !stale && result?.status === "favored" ? characters.find((character) => character.id === result.winnerId) : undefined;

  return <section className="comparison-view" aria-labelledby="comparison-title">
    <div className="section-kicker"><span>02 / LEITURA CRUZADA</span><span>SEM SIMULAÇÃO</span></div>
    <div className="section-title-row"><div><h1 id="comparison-title">Quem venceria?</h1><p>Consulte apenas pareceres já registrados no Atlas.</p></div><div className="saved-counter"><b>01</b><span>duelo<br />em análise</span></div></div>
    <div className="duel-selectors">
      <CharacterPicker label="PERSONAGEM A" ariaLabel="Buscar primeiro personagem" value={firstId} characters={characters.filter((character) => character.id !== secondId)} onChange={setFirstId} />
      <button type="button" className="swap-button" onClick={() => { setFirstId(secondId); setSecondId(firstId); }} disabled={!first || !second} aria-label="Trocar lados"><ArrowLeftRight size={19} /></button>
      <CharacterPicker label="PERSONAGEM B" ariaLabel="Buscar segundo personagem" value={secondId} characters={characters.filter((character) => character.id !== firstId)} onChange={setSecondId} />
    </div>
    {!valid && <div className="inline-alert" role="status">Escolha dois personagens diferentes para consultar o arquivo.</div>}
    {valid && <div className="compare-columns">
      {[first, second].map((character, index) => character && <article className="compare-person" key={character.id}>
        <button className="compare-person-heading" type="button" onClick={() => onOpenCharacter(character)}><span className="compare-monogram">{String(index + 1).padStart(2, "0")}</span><span><strong>{character.name}</strong><small>{character.universe} · Tier {tierLabel(character.tier)}</small></span></button>
        <ComparisonAttributes character={character} />
      </article>)}
    </div>}
    <section className="verdict-panel" aria-live="polite">
      <div className="verdict-label"><Swords size={15} /> PARECER SALVO</div>
      {lookup.isLoading ? <div className="verdict-message"><LoaderCircle className="spin" size={20} /> Consultando o arquivo de análises…</div>
        : lookup.isError ? <div className="inline-alert error" role="alert">Não foi possível consultar o parecer{lookup.error?.message ? `: ${lookup.error.message}` : ". Tente novamente."}</div>
        : !result ? <div className="verdict-message"><span className="verdict-symbol">?</span><div><h3>Sem análise registrada</h3><p>Este par ainda não tem um parecer salvo no Atlas. Nenhum vencedor será inferido.</p></div></div>
        : stale ? <div className="verdict-message verdict-stale"><span className="verdict-symbol">↻</span><div><h3>Parecer desatualizado</h3><p>Não há parecer atual válido para esta dupla. O registro existente aguarda revisão após mudanças nas fichas.</p></div></div>
        : result.status === "inconclusive" ? <div className="verdict-message"><span className="verdict-symbol">≈</span><div><h3>Inconclusivo</h3><p>O arquivo não estabelece um vencedor para este confronto. A conclusão permanece inconclusiva.</p></div></div>
        : <div className="verdict-message verdict-favored"><span className="verdict-symbol">↗</span><div><h3>{winner ? `${winner.name} — favorito no parecer salvo` : "Favorito no parecer salvo"}</h3><p>{displayValue(result.reason)}</p></div></div>}
      {result && !stale && <>
        <div className="verdict-meta"><span><small>CONFIANÇA</small><b>{displayValue(result.confidence)}</b></span><span><small>REVISÃO</small><b>{displayValue(result.review)}</b></span><span><small>EDIÇÃO</small><b>{displayValue(result.edition)}</b></span><span><small>PESQUISA</small><b>{displayValue(result.researchedAt)}</b></span></div>
        {result.reason && result.status === "inconclusive" && <div className="saved-evidence"><b>Por que não há conclusão</b><p>{displayValue(result.reason)}</p></div>}
        {result.counter && <div className="saved-evidence"><b>Contraponto registrado</b><p>{displayValue(result.counter)}</p></div>}
        {result.conditions && <div className="saved-evidence"><b>Condições do parecer</b><p>{displayValue(result.conditions)}</p></div>}
        {result.method && <div className="saved-evidence"><b>Método</b><p>{displayValue(result.method)}</p></div>}
        {profiles.map((value, index) => { const profile = value as Record<string, unknown>; const id = typeof profile.id === "string" ? profile.id : String(index); const character = characters.find((item) => item.id === id) ?? (index === 0 ? first : second); return <SavedProfile key={id} label={character?.name ?? id} value={value} />; })}
      </>}
      {result && stale && <p className="stale-note">Registro associado: {displayValue(result.review)}{result.edition ? ` · ${result.edition}` : ""}</p>}
    </section>
  </section>;
}
