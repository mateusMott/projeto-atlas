import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ExternalLink, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { AtlasCharacter } from "./types";
import { characterInitials, displayValue, profileField, tierLabel } from "./utils";

function FactBlock({ title, value, className = "" }: { title: string; value: unknown; className?: string }) {
  return <section className={`fact-block ${className}`}><h3>{title}</h3><p>{displayValue(value)}</p></section>;
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
  const powers = profileField(profile, "powers", "poderes");
  const weaknesses = profileField(profile, "weaknesses", "fraquezas");
  const observations = profileField(profile, "observations", "observation", "observacoes", "observações");
  const rankReason = profileField(profile, "rankReason", "tierReason", "justificativa");
  const summary = profileField(profile, "summary", "resumo");
  const version = profileField(profile, "version", "versao", "versão");
  const sources = profileField(profile, "sources");
  const sourceNote = profileField(profile, "sourceNote", "notaFonte");
  const sourceUrl = character?.sourceUrl ?? (typeof profile.sourceUrl === "string" ? profile.sourceUrl : "");

  return <>
    <Dialog open={Boolean(character)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sheet-dialog">
        {character && <>
          <DialogHeader className="sheet-header"><div><span className={`tier-tag tier-${tierLabel(character.tier).toLowerCase()}`}>TIER {tierLabel(character.tier)}</span><span className="sheet-universe">{character.universe || "Universo não informado"}</span></div>
            <DialogTitle>{character.name}</DialogTitle>
            <DialogDescription>{displayValue(summary)}</DialogDescription>
          </DialogHeader>
          <div className="sheet-body">
            <button type="button" className="sheet-image-button" onClick={() => setZoom(true)} aria-label={`Ampliar imagem de ${character.name}`}>
              {character.image && !imageFailed ? <img src={character.image} alt={`Imagem de ${character.name}`} onError={() => setImageFailed(true)} /> : <span className="art-fallback"><ImageIcon size={24} /><b>{characterInitials(character.name)}</b></span>}
              <span className="image-enlarge-hint">Ampliar imagem</span>
            </button>
            <div className="sheet-facts">
              <FactBlock title="Versão considerada" value={version} />
              <FactBlock title="Mentalidade" value={mentality} />
              <FactBlock title="Atributos de combate" value={combat} className="fact-combat" />
              <FactBlock title="Poderes" value={powers} />
              <FactBlock title="Fraquezas" value={weaknesses} />
              <FactBlock title="Observações" value={observations} />
              <FactBlock title="Justificativa do tier" value={rankReason} />
              <FactBlock title="Aliases" value={character.aliases} />
              <FactBlock title="Nota da fonte" value={sourceNote} />
              {Array.isArray(sources) && sources.length > 0 && <section className="fact-block"><h3>Fontes registradas</h3><ul className="source-list">{sources.map((source, index) => {
                const item = source as Record<string, unknown>;
                const url = typeof item.url === "string" ? item.url : "";
                return <li key={`${url}-${index}`}>{url ? <a href={url} target="_blank" rel="noreferrer">{displayValue(item.title ?? url)} <ExternalLink size={13} /></a> : displayValue(source)}{item.kind ? <small>{displayValue(item.kind)}</small> : null}</li>;
              })}</ul></section>}
              {sourceUrl ? <section className="fact-block"><h3>Fonte</h3><p><a href={sourceUrl} target="_blank" rel="noreferrer">{sourceUrl} <ExternalLink size={13} /></a></p></section> : <FactBlock title="Fonte" value={undefined} />}
            </div>
          </div>
          <div className="sheet-footer"><span className="live-dot" />FICHA DE REFERÊNCIA · SEM PONTUAÇÃO SINTÉTICA</div>
        </>}
      </DialogContent>
    </Dialog>
    <Dialog open={zoom && Boolean(character?.image) && !imageFailed} onOpenChange={setZoom}>
      <DialogContent className="image-dialog" aria-describedby="image-caption">
        {character?.image && <><button type="button" className="image-dialog-close" onClick={() => setZoom(false)} aria-label="Fechar imagem ampliada"><X size={20} /></button><img src={character.image} alt={`Imagem ampliada de ${character.name}`} /><p id="image-caption">{character.name}</p></>}
      </DialogContent>
    </Dialog>
  </>;
}
