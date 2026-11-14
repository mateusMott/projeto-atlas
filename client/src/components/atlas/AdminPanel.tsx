import { trpc } from "@/lib/trpc";
import { AlertTriangle, Download, FilePlus2, LoaderCircle, Save, Search, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import type { AtlasCharacter, CatalogResponse, ResearchCounts, ResearchInfo } from "./types";
import { displayValue, makeCharacterId, searchText, tierLabel } from "./utils";

type AdminDashboard = { characters: AtlasCharacter[]; researchCounts: ResearchCounts; researchInfo: ResearchInfo };
type DashboardHook = { data?: AdminDashboard; isLoading: boolean; isError: boolean; error?: { message?: string }; refetch: () => Promise<unknown> };
type MutationHook<T> = { mutateAsync: (input: T) => Promise<unknown>; isPending: boolean; error?: { message?: string }; reset: () => void };
type AdminApi = { atlas: { admin: { dashboard: { useQuery: () => DashboardHook }; saveCharacter: { useMutation: () => MutationHook<{ character: AtlasCharacter }> }; deleteCharacter: { useMutation: () => MutationHook<{ id: string }> }; exportData: { useQuery: (input: undefined, options: { enabled: boolean }) => { data?: unknown; isLoading: boolean; refetch: () => Promise<{ data?: unknown }> } } } } };
const atlasApi = trpc as unknown as AdminApi;
const EMPTY: AtlasCharacter = { id: "", name: "", universe: "", tier: "", image: "", ranked: false, aliases: [], profile: {} };
const TIERS = [{ value: "1", label: "S" }, { value: "2", label: "A" }, { value: "3", label: "B" }, { value: "4", label: "C" }, { value: "5", label: "D" }];

function Metric({ label, value, accent = false }: { label: string; value: unknown; accent?: boolean }) { return <div className={`admin-metric ${accent ? "metric-accent" : ""}`}><small>{label}</small><strong>{displayValue(value)}</strong></div>; }
function jsonPretty(value: unknown) { try { return JSON.stringify(value ?? {}, null, 2); } catch { return "{}"; } }

export function AdminPanel({ catalog }: { catalog: CatalogResponse | undefined }) {
  const queryUtils = trpc.useUtils() as any;
  const dashboard = atlasApi.atlas.admin.dashboard.useQuery();
  const save = atlasApi.atlas.admin.saveCharacter.useMutation();
  const remove = atlasApi.atlas.admin.deleteCharacter.useMutation();
  const exportQuery = atlasApi.atlas.admin.exportData.useQuery(undefined, { enabled: false });
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState("");
  const [draft, setDraft] = useState<AtlasCharacter | null>(null);
  const [formError, setFormError] = useState("");
  const [notice, setNotice] = useState("");
  const [mentalidadeText, setMentalidadeText] = useState("");
  const [combatText, setCombatText] = useState("");
  const characters = dashboard.data?.characters ?? catalog?.characters ?? [];
  const counts = dashboard.data?.researchCounts ?? catalog?.researchCounts;
  const info = dashboard.data?.researchInfo ?? catalog?.researchInfo;
  const list = useMemo(() => characters.filter((character) => searchText(character).includes(filter.toLocaleLowerCase("pt-BR"))), [characters, filter]);

  const beginEdit = (character: AtlasCharacter) => {
    setSelectedId(character.id); setDraft({ ...character, profile: { ...(character.profile ?? {}) } });
    setMentalidadeText(jsonPretty(character.profile?.mentalidade)); setCombatText(jsonPretty(character.profile?.combat));
    setFormError(""); setNotice(""); save.reset(); remove.reset();
  };
  const newCharacter = () => {
    const character = { ...EMPTY, id: makeCharacterId("novo-personagem"), profile: {} };
    setFilter(""); beginEdit(character); setNotice("");
  };
  const setTop = (key: keyof AtlasCharacter, value: unknown) => setDraft((current) => current ? { ...current, [key]: value } : current);
  const setProfile = (key: string, value: unknown) => setDraft((current) => current ? { ...current, profile: { ...(current.profile ?? {}), [key]: value } } : current);

  const saveCharacter = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault(); if (!draft) return;
    setFormError(""); setNotice("");
    let mentalidade: unknown; let combat: unknown;
    try { mentalidade = JSON.parse(mentalidadeText || "{}"); } catch { setFormError("O campo Mentalidade precisa conter JSON válido."); return; }
    try { combat = JSON.parse(combatText || "{}"); } catch { setFormError("Os Atributos de combate precisam conter JSON válido."); return; }
    const profile = { ...draft.profile, mentalidade, combat };
    if (!draft.name.trim()) { setFormError("Informe o nome do personagem."); return; }
    const character: AtlasCharacter = { ...draft, id: draft.id || makeCharacterId(draft.name), name: draft.name.trim(), profile };
    try {
      await save.mutateAsync({ character });
      setDraft(character); setSelectedId(character.id); setNotice(`“${character.name}” foi salvo.`);
      await Promise.all([dashboard.refetch(), queryUtils.atlas.catalog.invalidate()]);
    } catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível salvar. Tente novamente."); }
  };

  const deleteCharacter = async () => {
    if (!draft || !window.confirm(`Remover “${draft.name}” do catálogo? Esta ação não apaga análises salvas.`)) return;
    setFormError(""); setNotice("");
    try { await remove.mutateAsync({ id: draft.id }); setDraft(null); setSelectedId(""); setNotice(`“${draft.name}” foi removido do catálogo.`); await Promise.all([dashboard.refetch(), queryUtils.atlas.catalog.invalidate()]); }
    catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível remover o personagem."); }
  };

  const exportData = async () => {
    try {
      const result = await exportQuery.refetch();
      const data = result.data ?? exportQuery.data;
      if (data === undefined) throw new Error("A exportação não retornou dados.");
      const blob = new Blob([typeof data === "string" ? data : JSON.stringify(data, null, 2)], { type: "application/json;charset=utf-8" });
      const href = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = href; anchor.download = `atlas-export-${new Date().toISOString().slice(0, 10)}.json`; anchor.click(); URL.revokeObjectURL(href);
    } catch (error) { setFormError(error instanceof Error ? error.message : "Não foi possível exportar os dados."); }
  };

  return <section className="admin-view" aria-labelledby="admin-title">
    <div className="section-kicker"><span>03 / ACESSO RESTRITO</span><span><ShieldCheck size={13} /> SESSÃO DE ADMINISTRADOR</span></div>
    <div className="section-title-row"><div><h1 id="admin-title">Administração</h1><p>Gerencie as fichas e acompanhe a cobertura do arquivo.</p></div><button className="outline-action" type="button" onClick={exportData} disabled={exportQuery.isLoading}><Download size={16} />{exportQuery.isLoading ? "Preparando…" : "Exportar JSON"}</button></div>
    {dashboard.isLoading && <div className="loading-panel"><LoaderCircle className="spin" size={20} /> Carregando painel administrativo…</div>}
    {dashboard.isError && <div className="inline-alert error" role="alert">Não foi possível carregar o painel{dashboard.error?.message ? `: ${dashboard.error.message}` : "."}</div>}
    {counts && <div className="admin-metrics"><Metric label="PERSONAGENS" value={dashboard.data?.characters.length ?? counts.total} /><Metric label="PARES ANALISADOS" value={counts.total} accent /><Metric label="COM FAVORITO" value={counts.favored} /><Metric label="INCONCLUSIVOS" value={counts.inconclusive} /><Metric label="DESATUALIZADOS" value={counts.stale} /><Metric label="PARECERES ESPECÍFICOS" value={counts.specific} /></div>}
    {info && <p className="admin-edition">Pesquisa {displayValue(info.edition)} · {displayValue(info.researchedAt)}</p>}
    <div className="admin-workspace">
      <aside className="admin-list-panel"><div className="admin-list-head"><div><small>CATÁLOGO</small><strong>{characters.length} fichas</strong></div><button className="new-character-button" type="button" onClick={newCharacter}><FilePlus2 size={15} /> Novo</button></div>
        <label className="admin-search"><Search size={16} /><input type="search" value={filter} onChange={(event) => setFilter(event.target.value)} placeholder="Buscar no catálogo" aria-label="Buscar personagem para editar" /></label>
        <div className="admin-character-list">{list.map((character) => <button key={character.id} type="button" className={`admin-character-row ${selectedId === character.id ? "selected" : ""}`} onClick={() => beginEdit(character)}><span className="admin-list-avatar">{character.name.slice(0, 1).toUpperCase()}</span><span><strong>{character.name}</strong><small>{character.universe} · {character.ranked ? `Tier ${tierLabel(character.tier)}` : "Fora do ranking"}</small></span></button>)}
          {!list.length && <div className="admin-list-empty">Nenhum personagem encontrado.</div>}</div>
      </aside>
      <div className="admin-editor-panel">
        {!draft ? <div className="editor-placeholder"><FilePlus2 size={24} /><h3>Selecione uma ficha</h3><p>Abra um personagem na lista ou crie uma nova ficha.</p></div> : <form onSubmit={saveCharacter} className="character-editor">
          <div className="editor-heading"><div><small>{characters.some((character) => character.id === draft.id) ? "EDITAR FICHA" : "NOVA FICHA"}</small><h2>{draft.name || "Novo personagem"}</h2></div><button className="delete-button" type="button" onClick={deleteCharacter} disabled={!characters.some((character) => character.id === draft.id) || remove.isPending} aria-label="Remover personagem"><Trash2 size={16} />{remove.isPending ? "Removendo…" : "Remover"}</button></div>
          <div className="editor-grid"><label className="form-field"><span>Nome</span><input value={draft.name} onChange={(event) => { const name = event.target.value; setTop("name", name); if (!characters.some((character) => character.id === draft.id)) setTop("id", makeCharacterId(name)); }} required /></label>
            <label className="form-field"><span>ID</span><input value={draft.id} onChange={(event) => setTop("id", event.target.value)} required /></label>
            <label className="form-field"><span>Universo</span><input value={draft.universe} onChange={(event) => setTop("universe", event.target.value)} /></label>
            <label className="form-field"><span>Tier</span><select value={draft.tier === null ? "" : String(draft.tier)} onChange={(event) => setTop("tier", event.target.value)}><option value="">Sem tier</option>{TIERS.map((tier) => <option key={tier.value} value={tier.value}>Tier {tier.label}</option>)}</select></label>
            <label className="form-field form-field-wide"><span>Imagem (URL)</span><input type="url" value={draft.image} onChange={(event) => setTop("image", event.target.value)} placeholder="https://…" /></label>
            <label className="form-field form-field-wide"><span>Aliases <small>separados por vírgula</small></span><input value={Array.isArray(draft.aliases) ? draft.aliases.join(", ") : String(draft.aliases ?? "")} onChange={(event) => setTop("aliases", event.target.value.split(/[,\n]/).map((value) => value.trim()).filter(Boolean))} /></label>
            <label className="form-check form-field-wide"><input type="checkbox" checked={draft.ranked} onChange={(event) => setTop("ranked", event.target.checked)} /><span>Participa do ranking</span></label>
          </div>
          <h3 className="editor-subtitle">Perfil de combate</h3>
          <div className="editor-grid"><label className="form-field form-field-wide"><span>Resumo / versão</span><textarea rows={3} value={String(draft.profile.summary ?? "")} onChange={(event) => setProfile("summary", event.target.value)} /></label>
            <label className="form-field"><span>Mentalidade <small>JSON</small></span><textarea rows={5} value={mentalidadeText} onChange={(event) => setMentalidadeText(event.target.value)} spellCheck={false} /></label>
            <label className="form-field"><span>Atributos de combate <small>JSON</small></span><textarea rows={5} value={combatText} onChange={(event) => setCombatText(event.target.value)} spellCheck={false} /></label>
            <label className="form-field"><span>Poderes <small>um por linha</small></span><textarea rows={5} value={Array.isArray(draft.profile.powers) ? draft.profile.powers.map(String).join("\n") : String(draft.profile.powers ?? "")} onChange={(event) => setProfile("powers", event.target.value.split("\n").map((item) => item.trim()).filter(Boolean))} /></label>
            <label className="form-field"><span>Fraquezas</span><textarea rows={5} value={Array.isArray(draft.profile.weaknesses) ? draft.profile.weaknesses.map(String).join("\n") : String(draft.profile.weaknesses ?? "")} onChange={(event) => setProfile("weaknesses", event.target.value)} /></label>
            <label className="form-field form-field-wide"><span>Observações</span><textarea rows={3} value={String(draft.profile.observation ?? draft.profile.observations ?? "")} onChange={(event) => setProfile("observation", event.target.value)} /></label>
            <label className="form-field form-field-wide"><span>Justificativa do tier</span><textarea rows={3} value={String(draft.profile.rankReason ?? "")} onChange={(event) => setProfile("rankReason", event.target.value)} /></label>
            <label className="form-field"><span>Fonte (URL)</span><input type="url" value={String(draft.sourceUrl ?? "")} onChange={(event) => setTop("sourceUrl", event.target.value)} /></label>
            <label className="form-field"><span>Nota da fonte</span><textarea rows={3} value={String(draft.profile.sourceNote ?? "")} onChange={(event) => setProfile("sourceNote", event.target.value)} /></label>
            <label className="form-field form-field-wide"><span>Versão considerada nas análises</span><textarea rows={2} value={String(draft.profile.version ?? "")} onChange={(event) => setProfile("version", event.target.value)} /></label>
          </div>
          <details className="profile-json-editor"><summary>Profile JSON completo <span>(chaves não exibidas acima serão preservadas)</span></summary><pre>{jsonPretty(draft.profile)}</pre></details>
          {formError && <div className="inline-alert error" role="alert"><AlertTriangle size={16} />{formError}</div>}{notice && <div className="inline-alert success" role="status">{notice}</div>}
          {save.error && !formError && <div className="inline-alert error" role="alert">{save.error.message ?? "Falha ao salvar."}</div>}
          <div className="editor-actions"><span>{save.isPending ? <><LoaderCircle className="spin" size={15} /> Salvando…</> : "As alterações são compartilhadas com os demais dispositivos."}</span><button className="save-button" type="submit" disabled={save.isPending || remove.isPending}><Save size={16} />{save.isPending ? "Salvando…" : "Salvar ficha"}</button></div>
        </form>}
      </div>
    </div>
  </section>;
}
