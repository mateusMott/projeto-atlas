import { ArrowRightLeft, CircleUserRound, Command, LogOut, Search, Shield, Swords } from "lucide-react";
import type { ReactNode } from "react";

type Section = "ranking" | "compare" | "admin";
type Props = { section: Section; onSection: (section: Section) => void; isAdmin: boolean; isAuthenticated: boolean; userLabel?: string; onLogin: () => void; onLogout: () => void; logoutBusy?: boolean; onFocusSearch: () => void };

export function AtlasHeader({ section, onSection, isAdmin, isAuthenticated, userLabel, onLogin, onLogout, logoutBusy, onFocusSearch }: Props) {
  const tabs: { id: Section; label: string; icon: ReactNode }[] = [
    { id: "ranking", label: "Ranking", icon: <Swords size={15} /> },
    { id: "compare", label: "Comparação", icon: <ArrowRightLeft size={15} /> },
    { id: "admin", label: "Administração", icon: <Shield size={15} /> },
  ];
  return <header className="atlas-header">
    <a className="atlas-brand" href="#top" aria-label="ATLAS — início">
      <span className="brand-symbol"><img src="/atlas-symbol.svg" alt="" /></span>
      <span className="brand-word">ATLAS<span className="brand-period">.</span></span>
    </a>
    <div className="header-status"><span className="status-pip" /> ARQUIVO DE PERSONAGENS</div>
    <nav className="main-nav" aria-label="Navegação principal">
      {tabs.map((tab) => <button type="button" key={tab.id} className={`nav-tab ${section === tab.id ? "active" : ""}`} onClick={() => onSection(tab.id)} aria-current={section === tab.id ? "page" : undefined}>
        {tab.icon}<span>{tab.label}</span>{tab.id === "admin" && isAdmin && <i className="nav-admin-dot" aria-label="Acesso administrativo" />}
      </button>)}
    </nav>
    <div className="header-actions">
      <button className="icon-button search-shortcut" type="button" onClick={onFocusSearch} aria-label="Pesquisar (Ctrl+K)"><Search size={16} /><kbd><Command size={11} /> K</kbd></button>
      {isAuthenticated ? <div className="user-menu"><span className="user-label"><CircleUserRound size={15} />{userLabel || "Conta"}</span><button type="button" className="quiet-button" onClick={onLogout} disabled={logoutBusy} aria-label="Sair"><LogOut size={15} /><span>{logoutBusy ? "Saindo…" : "Sair"}</span></button></div> : <button className="login-button" type="button" onClick={onLogin}><CircleUserRound size={15} />Entrar</button>}
    </div>
  </header>;
}
