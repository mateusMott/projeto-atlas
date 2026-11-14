import { Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AtlasCharacter } from "./types";
import { characterInitials, displayValue, profileField, tierLabel } from "./utils";

function DetailSection({ title, className = "", children }: { title: string; className?: string; children: React.ReactNode }) {
  return <section className={`sheet-section ${className}`}><h3 className="sheet-section-title">{title}</h3>{children}</section>;
}

function DetailRows({ value }: { value: unknown }) {
  const rows = value && typeof value === "object" && !Array.isArray(value)
    ? Object.entries(value as Record<string, unknown>)
    : [];

  if (rows.length === 0) return <p className="sheet-empty-value">{displayValue(value)}</p>;

  return <dl className="sheet-detail-rows">{rows.map(([label, item]) => <div className="sheet-detail-row" key={label}>
    <dt>{label}</dt><dd>{displayValue(item)}</dd>
  </div>)}</dl>;
}

function tagValues(value: unknown) {
  if (Array.isArray(value)) return value.map(displayValue).filter((item) => item !== "Não informado na ficha.");
  if (value && typeof value === "object") return Object.values(value as Record<string, unknown>).map(displayValue).filter((item) => item !== "Não informado na ficha.");
  return typeof value === "string" && value.trim() ? [value.trim()] : [];
}

export function CharacterSheet({ character, onClose }: { character: AtlasCharacter | null; onClose: () => void }) {
  const [zoom, setZoom] = useState(false);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    setImageFailed(false);
    setZoom(false);
  }, [character?.id]);

  const profile = character?.profile ?? {};
  const combat = profileField(profile, "combat", "attributes");
  const mentality = profileField(profile, "mentalidade", "mentality");
  const powers = tagValues(profileField(profile, "powers", "poderes"));
  const weaknesses = profileField(profile, "weaknesses", "fraquezas");
  const observations = profileField(profile, "observations", "observation", "observacoes", "observações");
  const rankReason = profileField(profile, "rankReason", "tierReason", "justificativa");
  const summary = profileField(profile, "summary", "resumo");
  const version = profileField(profile, "version", "versao", "versão");
  const sources = profileField(profile, "sources");
  const sourceNote = profileField(profile, "sourceNote", "notaFonte");
  const sourceUrl = character?.sourceUrl ?? (typeof profile.sourceUrl === "string" ? profile.sourceUrl : "");
  const label = character ? tierLabel(character.tier) : "—";

  return <>
    <Dialog open={Boolean(character)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sheet-dialog" showCloseButton={false}>
        {character && <div className="sheet-layout">
          <aside className="sheet-art-panel" aria-label={`Imagem de ${character.name}`}>
            <button
              type="button"
              className="sheet-image-button"
              onClick={() => setZoom(true)}
              disabled={!character.image || imageFailed}
              aria-label={`Ampliar imagem de ${character.name}`}
            >
              {character.image && !imageFailed
                ? <img src={character.image} alt={`Imagem de ${character.name}`} onError={() => setImageFailed(true)} />
                : <span className="art-fallback"><ImageIcon size={26} /><b>{characterInitials(character.name)}</b><small>Imagem não disponível</small></span>}
              <span className="image-enlarge-hint">{character.image && !imageFailed ? "Clique para ampliar" : ""}</span>
            </button>
          </aside>

          <div className="sheet-scroll-panel">
            <DialogClose asChild>
              <button type="button" className="sheet-close-button" aria-label="Fechar ficha de personagem"><X size={18} /></button>
            </DialogClose>

            <DialogHeader className="sheet-header">
              <p className="sheet-eyebrow">FICHA DE REFERÊNCIA <span>/</span> ATLAS</p>
              <DialogTitle>{character.name}</DialogTitle>
              <DialogDescription>
                {character.universe || "Universo não informado"} <span aria-hidden="true">·</span> {character.ranked ? "Ranking principal" : "Catálogo"}
              </DialogDescription>
            </DialogHeader>

            <div className="sheet-details">
              <section className="sheet-tier-card" aria-label={`Classificação Tier ${label}`}>
                <span className={`tier-tag tier-${label.toLowerCase()}`}>TIER {label}</span>
                <div className="sheet-tier-copy">
                  <h3>{label === "S" ? "Topo absoluto" : character.ranked ? "Ranking principal" : "Sem classificação no ranking"}</h3>
                  <p>{displayValue(rankReason)}</p>
                </div>
              </section>

              <DetailSection title="Descrição geral">
                <p className="sheet-prose">{displayValue(summary)}</p>
              </DetailSection>

              <DetailSection title="Mentalidade" className="sheet-section-compact">
                <DetailRows value={mentality} />
              </DetailSection>

              <DetailSection title="Ficha de combate" className="sheet-combat-section">
                <DetailRows value={combat} />
              </DetailSection>

              <DetailSection title="Poderes">
                {powers.length > 0
                  ? <ul className="sheet-power-tags">{powers.map((power, index) => <li key={`${power}-${index}`}>{power}</li>)}</ul>
                  : <p className="sheet-empty-value">{displayValue(undefined)}</p>}
              </DetailSection>

              <DetailSection title="Fraquezas">
                <p className="sheet-prose">{displayValue(weaknesses)}</p>
              </DetailSection>

              <DetailSection title="Observações">
                <p className="sheet-prose">{displayValue(observations)}</p>
              </DetailSection>

              <DetailSection title="Versão e aliases" className="sheet-section-compact">
                <dl className="sheet-detail-rows">
                  <div className="sheet-detail-row"><dt>Versão considerada</dt><dd>{displayValue(version)}</dd></div>
                  <div className="sheet-detail-row"><dt>Aliases</dt><dd>{displayValue(character.aliases)}</dd></div>
                </dl>
              </DetailSection>

              <DetailSection title="Fontes e referências" className="sheet-source-section">
                {sourceNote !== undefined && <div className="sheet-source-note"><b>Nota da fonte</b><p className="sheet-prose">{displayValue(sourceNote)}</p></div>}
                {Array.isArray(sources) && sources.length > 0 && <ul className="source-list sheet-source-list">{sources.map((source, index) => {
                  const item = source && typeof source === "object" && !Array.isArray(source) ? source as Record<string, unknown> : {};
                  const url = typeof item.url === "string" ? item.url : (typeof source === "string" && /^https?:\/\//i.test(source) ? source : "");
                  const title = item.title ?? (url ? url : source);
                  return <li key={`${url}-${index}`}>
                    {url ? <a href={url} target="_blank" rel="noopener noreferrer">{displayValue(title)} <ExternalLink size={13} /></a> : displayValue(source)}
                    {item.kind ? <small>{displayValue(item.kind)}</small> : null}
                  </li>;
                })}</ul>}
                {sourceUrl
                  ? <a className="sheet-primary-source" href={sourceUrl} target="_blank" rel="noopener noreferrer">Ver ficha na fonte <ExternalLink size={14} /></a>
                  : <p className="sheet-empty-value">Fonte direta não informada.</p>}
              </DetailSection>
            </div>

            <div className="sheet-footer"><span className="live-dot" />FICHA DE REFERÊNCIA · SEM PONTUAÇÃO SINTÉTICA</div>
          </div>
        </div>}
      </DialogContent>
    </Dialog>

    <Dialog open={zoom && Boolean(character?.image) && !imageFailed} onOpenChange={setZoom}>
      <DialogContent className="image-dialog" aria-describedby="image-caption" showCloseButton={false}>
        {character?.image && <>
          <button type="button" className="image-dialog-close" onClick={() => setZoom(false)} aria-label="Fechar imagem ampliada"><X size={20} /></button>
          <img src={character.image} alt={`Imagem ampliada de ${character.name}`} />
          <p id="image-caption">{character.name}</p>
        </>}
      </DialogContent>
    </Dialog>
  </>;
}
