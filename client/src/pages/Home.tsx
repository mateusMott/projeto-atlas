import { startLogin } from "@/const";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { AlertTriangle, ArrowDown, ArrowUp, BookOpen, Check, Command, LoaderCircle, Search, Shield, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminPanel } from "@/components/atlas/AdminPanel";
import { AtlasHeader } from "@/components/atlas/AtlasHeader";
import { CharacterCard } from "@/components/atlas/CharacterCard";
import { CharacterSheet } from "@/components/atlas/CharacterSheet";
import { ComparisonPanel } from "@/components/atlas/ComparisonPanel";
import { TierSections } from "@/components/atlas/TierSections";
import type { AtlasCharacter, CatalogResponse } from "@/components/atlas/types";
import { normalizeSearch, searchText, tierLabel } from "@/components/atlas/utils";

type Section = "ranking" | "compare" | "admin";
type CatalogQuery = { data?: CatalogResponse; isLoading: boolean; isError: boolean; error?: { message?: string }; refetch: () => Promise<unknown> };
type AuthUser = { role?: string; name?: string; email?: string; [key: string]: unknown };
type AuthShape = { user: AuthUser | null; loading: boolean; isAuthenticated: boolean; logout: () => Promise<void> };
const atlasApi = trpc as unknown as { atlas: { catalog: { useQuery: () => CatalogQuery } } };

const FILTERS = ["Todos", "Marvel", "DC", "SCP", "Anime"] as const;
const ANIME_HINTS = ["anime", "dragon ball", "naruto", "one piece", "bleach", "hunter x hunter", "jujutsu", "saint seiya", "cavaleiros", "sailor moon", "pokemon", "my hero", "boku no hero", "chainsaw", "demon slayer", "kimetsu", "evangelion", "goku"];
function universeMatches(universe: string, filter: string) {
  if (filter === "Todos") return true;
  const value = universe.toLocaleLowerCase("pt-BR");
  if (filter === "Anime") return ANIME_HINTS.some((hint) => value.includes(hint));
  return value.includes(filter.toLocaleLowerCase("pt-BR"));
}

export default function Home() {
  const session = useAuth() as AuthShape;
  const catalogQuery = atlasApi.atlas.catalog.useQuery();
  const [section, setSection] = useState<Section>("ranking");
  const [universe, setUniverse] = useState<string>("Todos");
  const [search, setSearch] = useState("");
  const [focused, setFocused] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [showAllCatalog, setShowAllCatalog] = useState(false);
  const [selectedCharacter, setSelectedCharacter] = useState<AtlasCharacter | null>(null);
  const [authError, setAuthError] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const catalog = catalogQuery.data;
  const characters = catalog?.characters ?? [];
  const isAdmin = session.user?.role === "admin";
  const isAuthenticated = session.isAuthenticated;

  const normalizedSearch = normalizeSearch(search.trim());
  const filtered = useMemo(() => characters.filter((character) => universeMatches(character.universe ?? "", universe) && (!normalizedSearch || searchText(character).includes(normalizedSearch))), [characters, universe, normalizedSearch]);
  const suggestions = useMemo(() => normalizedSearch ? characters.filter((character) => universeMatches(character.universe ?? "", universe) && searchText(character).includes(normalizedSearch)).slice(0, 8) : [], [characters, universe, normalizedSearch]);
  const focusSearch = useCallback(() => { setSection("ranking"); window.setTimeout(() => searchRef.current?.focus(), 30); }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); focusSearch(); }
      if (event.key === "Escape") { setFocused(false); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [focusSearch]);

  const onSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" && suggestions.length) { event.preventDefault(); setActiveSuggestion((current) => Math.min(current + 1, suggestions.length - 1)); }
    if (event.key === "ArrowUp" && suggestions.length) { event.preventDefault(); setActiveSuggestion((current) => Math.max(current - 1, 0)); }
    if (event.key === "Enter" && suggestions.length) { event.preventDefault(); setSelectedCharacter(suggestions[Math.max(0, activeSuggestion)]); setFocused(false); }
    if (event.key === "Escape") { setFocused(false); }
  };

  const goLogin = () => { setAuthError(""); try { startLogin(); } catch (error) { setAuthError(error instanceof Error ? error.message : "O login não está configurado neste ambiente."); } };
  const logout = async () => { try { await session.logout(); } catch (error) { setAuthError(error instanceof Error ? error.message : "Não foi possível sair da conta."); } };
  const openSection = (next: Section) => { setSection(next); if (next !== "ranking") { setFocused(false); setSearch(""); } };

  return <div className="atlas-shell" id="top">
    <div className="ambient-glow ambient-green" /><div className="ambient-glow ambient-blue" />
    <AtlasHeader section={section} onSection={openSection} isAdmin={isAdmin} isAuthenticated={isAuthenticated} userLabel={session.user?.name || session.user?.email} onLogin={goLogin} onLogout={logout} logoutBusy={session.loading} onFocusSearch={focusSearch} />
    <main className="atlas-main">
      {section === "ranking" && <>
        <section className="hero-search" aria-labelledby="hero-title">
          <div className="hero-stamp"><Sparkles size={13} /> ÍNDICE DE CONFRONTO <span>VOL. 01</span></div>
          <h1 id="hero-title">Poder além<br /><em>das escalas.</em></h1>
          <p>Uma leitura organizada de personagens, universos e confrontos.</p>
          <div className={`search-wrap ${focused ? "is-focused" : ""}`}>
            <Search size={19} aria-hidden="true" />
            <input ref={searchRef} type="search" value={search} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 120)} onChange={(event) => { setSearch(event.target.value); setActiveSuggestion(-1); }} onKeyDown={onSearchKeyDown} placeholder="Pesquisar personagem, alias ou habilidade…" aria-label="Pesquisar nome, alias, universo e conteúdo integral das fichas" aria-controls="search-results" aria-activedescendant={focused && activeSuggestion >= 0 ? `search-option-${activeSuggestion}` : undefined} aria-expanded={focused && suggestions.length > 0} autoComplete="off" />
            {search ? <button type="button" className="clear-search" onMouseDown={(event) => event.preventDefault()} onClick={() => { setSearch(""); setActiveSuggestion(-1); searchRef.current?.focus(); }} aria-label="Limpar busca"><X size={16} /></button> : <kbd className="search-hint"><Command size={11} /> K</kbd>}
            {focused && suggestions.length > 0 && <div className="search-results" id="search-results" role="listbox" aria-label="Resultados de busca">{suggestions.map((character, index) => <button type="button" role="option" id={`search-option-${index}`} aria-selected={index === activeSuggestion} key={character.id} className={index === activeSuggestion ? "active" : ""} onMouseDown={(event) => event.preventDefault()} onMouseEnter={() => setActiveSuggestion(index)} onClick={() => { setSelectedCharacter(character); setFocused(false); }}><span className="suggestion-initial">{character.name.slice(0, 1)}</span><span><strong>{character.name}</strong><small>{character.universe} · Tier {tierLabel(character.tier)}{!character.ranked ? " · Catálogo" : ""}</small></span><ArrowUp size={14} className="suggestion-open" /></button>)}</div>}
          </div>
          <div className="search-helper"><span><ArrowUp size={12} /><ArrowDown size={12} /> navegar</span><span>ENTER abrir ficha</span><span><kbd>ESC</kbd> fechar</span></div>
          <div className="hero-statline"><span><b>{catalog?.characters.length ?? "—"}</b> PERSONAGENS NO ARQUIVO</span><i /><span><b>{characters.filter((character) => character.ranked).length || "—"}</b> NO RANKING</span><i /><span><b>{catalog?.researchCounts.total ?? "—"}</b> PARECERES SALVOS</span></div>
        </section>
        <section className="ranking-section" aria-labelledby="ranking-title">
          <div className="section-kicker"><span>01 / CLASSIFICAÇÃO</span><span>POR EVIDÊNCIA E ESCOPO</span></div>
          <div className="section-title-row"><div><h2 id="ranking-title">Ranking de poder</h2><p>Hierarquia editorial por tier. A classificação não é pontuação de duelo.</p></div><span className="ranking-total">{filtered.filter((character) => character.ranked).length} <small>FICHAS</small></span></div>
          <div className="filter-bar" role="group" aria-label="Filtrar por universo">{FILTERS.map((filter) => <button type="button" key={filter} className={universe === filter ? "selected" : ""} onClick={() => setUniverse(filter)} aria-pressed={universe === filter}>{filter}</button>)}{search && <span className="filter-result-count">{filtered.length} resultado{filtered.length === 1 ? "" : "s"} para “{search}”</span>}</div>
          {catalogQuery.isLoading ? <div className="loading-panel"><LoaderCircle size={20} className="spin" /> Carregando catálogo…</div> : catalogQuery.isError ? <div className="error-panel" role="alert"><AlertTriangle size={20} /><div><b>O catálogo não pôde ser carregado.</b><p>{catalogQuery.error?.message ?? "Verifique a conexão e tente novamente."}</p><button type="button" className="outline-action" onClick={() => void catalogQuery.refetch()}>Tentar novamente</button></div></div> : <>
            <TierSections characters={filtered} onOpen={setSelectedCharacter} />
            {filtered.filter((character) => !character.ranked).length > 0 && <section className="catalog-section"><button type="button" className="tier-heading catalog-heading" onClick={() => setShowAllCatalog((value) => !value)} aria-expanded={showAllCatalog}><span className="tier-mark catalog-mark"><BookOpen size={17} /></span><span className="tier-name">Catálogo sem ranking</span><span className="tier-rule" /><span className="tier-count">{filtered.filter((character) => !character.ranked).length} personagens</span><span className="expand-label">{showAllCatalog ? "Ocultar" : "Abrir catálogo"}</span></button>{showAllCatalog && <div className="character-grid">{filtered.filter((character) => !character.ranked).map((character) => <CharacterCard key={character.id} character={character} onOpen={setSelectedCharacter} />)}</div>}</section>}
            {search && filtered.length === 0 && <div className="empty-state"><span className="empty-glyph">∅</span><h3>Nenhum personagem encontrado</h3><p>Experimente outro nome, alias, universo ou habilidade.</p><button type="button" className="quiet-action" onClick={() => { setSearch(""); setUniverse("Todos"); }}>Limpar busca e filtros</button></div>}
          </>}
          {catalog && <div className="research-footnote">EDIÇÃO {catalog.researchInfo.edition ?? "—"} <i /> PESQUISA {catalog.researchInfo.researchedAt ?? "—"} <i /> OS PARECERES SÃO REGISTROS, NÃO RESULTADOS DE SIMULAÇÃO</div>}
        </section>
      </>}
      {section === "compare" && (catalogQuery.isLoading ? <div className="loading-panel"><LoaderCircle size={20} className="spin" /> Carregando personagens para comparação…</div> : catalogQuery.isError ? <div className="error-panel" role="alert"><AlertTriangle size={20} />Não foi possível carregar o catálogo para comparação.</div> : <ComparisonPanel characters={characters} onOpenCharacter={setSelectedCharacter} />)}
      {section === "admin" && <>
        {isAdmin ? <AdminPanel catalog={catalog} /> : <section className="admin-gate"><div className="gate-icon"><Shield size={24} /></div><div className="section-kicker"><span>03 / ÁREA ADMINISTRATIVA</span><span>LEITURA PÚBLICA · ESCRITA RESTRITA</span></div><h1>Administração<br /><em>sob controle.</em></h1>{!isAuthenticated ? <><p>Entre com sua conta para verificar as permissões. Apenas contas com papel de administrador podem abrir o painel e salvar mudanças.</p><button className="login-button gate-login" type="button" onClick={goLogin}>Entrar com Manus <Check size={16} /></button></> : <><p>Esta sessão está autenticada, mas não possui o papel de administrador necessário para editar o catálogo.</p><div className="access-note"><Shield size={16} />O acesso administrativo é validado pelo servidor; não há modo de desenvolvimento alternativo.</div></>}{authError && <div className="inline-alert error" role="alert">{authError}</div>}</section>}
      </>}
      {authError && section !== "admin" && <div className="toast-error" role="alert">{authError}<button type="button" onClick={() => setAuthError("")} aria-label="Fechar"><X size={15} /></button></div>}
    </main>
    <footer className="atlas-footer"><a className="footer-brand" href="#top">ATLAS<span>.</span></a><span>PODER ALÉM DAS ESCALAS.</span><span>ARQUIVO DE REFERÊNCIA · {catalog?.researchInfo.edition ?? ""}</span></footer>
    <CharacterSheet character={selectedCharacter} onClose={() => setSelectedCharacter(null)} />
  </div>;
}
