import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation, useOutlet } from 'react-router-dom';
import {
  LayoutDashboard,
  MessagesSquare,
  LayoutTemplate,
  Settings,
  History,
  Search,
  Headset,
  Sun,
  Moon,
  RefreshCcw,
  LogOut,
  ShieldCheck,
  User,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import PageTransition from './PageTransition';
import styles from './Layout.module.css';

/* ----------------------------------------------------------------
   Barra Lateral
---------------------------------------------------------------- */
const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();
  const location = useLocation();
  const isTeamsPage = location.pathname === '/teams';
  const isAdmin = user?.role === 'Administrador Geral' || user?.role === 'Administrador';

  const checkAccess = (path) => {
    if (!user) return false;
    if (path === '/' || path === '/profile' || path === '/teams') return true;
    if (path === '/users') return isAdmin;
    if (!user.allowed_screens) return true;
    return user.allowed_screens.includes(path);
  };

  const mainItems = [
    { name: 'Dashboard',            path: '/',            icon: <LayoutDashboard size={18} /> },
    { name: 'Assistente Voll',      path: '/chat',        icon: <MessagesSquare  size={18} /> },
    { name: 'Espaços de Equipe',     path: '/teams',       icon: <Users           size={18} /> },
  ].filter(item => checkAccess(item.path));

  const toolItems = [
    { name: 'Fluxos de Atendimento', path: '/chatbots',    icon: <LayoutTemplate size={18} /> },
    { name: 'Assistente de Redação', path: '/responses',   icon: <Headset        size={18} /> },
    { name: 'Automação Interna',     path: '/automations', icon: <Settings       size={18} /> },
    { name: 'Gerador de Documentos', path: '/docs',        icon: <LayoutTemplate size={18} /> },
    { name: 'Refinamento de Textos', path: '/refine',      icon: <Settings       size={18} /> },
    { name: 'Biblioteca de Prompts', path: '/prompts',     icon: <LayoutTemplate size={18} /> },
  ].filter(item => checkAccess(item.path));

  const systemItems = [
    { name: 'Meu Perfil',    path: '/profile',  icon: <User     size={18} /> },
    { name: 'Histórico',     path: '/history',  icon: <History  size={18} /> },
    { name: 'Configurações', path: '/settings', icon: <Settings size={18} /> },
    ...(isAdmin ? [{ name: 'Controle de Acesso', path: '/users', icon: <ShieldCheck size={18} /> }] : []),
  ].filter(item => checkAccess(item.path));

  const renderGroup = (items) =>
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) => `${styles.navItem}${isActive ? ` ${styles.navItemActive}` : ''}`}
        title={isCollapsed ? item.name : undefined}
      >
        {item.icon}
        {!isCollapsed && <span>{item.name}</span>}
      </NavLink>
    ));

  return (
    <div className={`${styles.sidebar} ${isCollapsed ? styles.sidebarCollapsed : ''}`}>
      {/* Logotipo */}
      <div className={styles.sidebarLogo}>
        <img src="../images/RemoveFundo Icon.png" alt="Voll" className={styles.logoImg} />
        {!isCollapsed && <span>Voll Intelligence</span>}
      </div>

      {/* Navegação */}
      <nav className={styles.sidebarNav} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {renderGroup(mainItems)}

        <div className={styles.navSectionLabel}>Ferramentas</div>
        {renderGroup(toolItems)}

        <div className={styles.navSectionLabel}>Sistema</div>
        {renderGroup(systemItems)}

        {!isTeamsPage && (
          <button 
            className={styles.sidebarToggleBtn} 
            onClick={toggleSidebar}
            title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
            type="button"
          >
            {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        )}
      </nav>
    </div>
  );
};

/* ----------------------------------------------------------------
   Cabeçalho
---------------------------------------------------------------- */
const Header = ({ isDarkMode, toggleTheme }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const [sessions, setSessions] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleFocus = async () => {
    setFocused(true);
    try {
      const res = await fetch('http://localhost:3001/api/chat/sessions');
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load chat sessions in search bar:', err);
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setFocused(false);
      }
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = user?.role === 'Administrador Geral' || user?.role === 'Administrador';

  const checkAccess = (path) => {
    if (!user) return false;
    if (path === '/' || path === '/teams') return true;
    if (path === '/users') return isAdmin;
    if (!user.allowed_screens) return true;
    return user.allowed_screens.includes(path);
  };

  const tools = useMemo(() => [
    { name: 'Dashboard',            path: '/',            icon: <LayoutDashboard size={14} /> },
    { name: 'Assistente Voll (Chat)', path: '/chat',        icon: <MessagesSquare  size={14} /> },
    { name: 'Espaços de Equipe',     path: '/teams',       icon: <Users           size={14} /> },
    { name: 'Fluxos de Atendimento', path: '/chatbots',    icon: <LayoutTemplate size={14} /> },
    { name: 'Assistente de Redação', path: '/responses',   icon: <Headset        size={14} /> },
    { name: 'Automação Interna',     path: '/automations', icon: <Settings       size={14} /> },
    { name: 'Gerador de Documentos', path: '/docs',        icon: <LayoutTemplate size={14} /> },
    { name: 'Refinamento de Textos', path: '/refine',      icon: <Settings       size={14} /> },
    { name: 'Biblioteca de Prompts', path: '/prompts',     icon: <LayoutTemplate size={14} /> },
    { name: 'Histórico',            path: '/history',     icon: <History        size={14} /> },
    { name: 'Configurações',        path: '/settings',    icon: <Settings       size={14} /> },
    ...(isAdmin ? [{ name: 'Controle de Acesso', path: '/users', icon: <ShieldCheck size={14} /> }] : []),
  ].filter(item => checkAccess(item.path)), [user]);

  const filteredTools = useMemo(() => {
    if (!query) return tools;
    return tools.filter(t => t.name.toLowerCase().includes(query.toLowerCase()));
  }, [query, tools]);

  const filteredSessions = useMemo(() => {
    if (!query) return sessions.slice(0, 5);
    return sessions.filter(s => (s.title || '').toLowerCase().includes(query.toLowerCase())).slice(0, 5);
  }, [query, sessions]);

  const hasResults = filteredTools.length > 0 || filteredSessions.length > 0;

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className={styles.header}>
      <div className={styles.headerSearchWrapper} ref={searchRef}>
        <div className={`${styles.headerSearch} ${focused ? styles.headerSearchFocus : ''}`}>
          <Search size={16} />
          <input
            type="text"
            placeholder="Buscar ferramenta ou conversa…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={handleFocus}
          />
        </div>

        {focused && (
          <div className={styles.searchResultsDropdown}>
            {filteredTools.length > 0 && (
              <>
                <div className={styles.searchCategoryLabel}>Ferramentas</div>
                {filteredTools.map((tool) => (
                  <button
                    key={tool.path}
                    className={styles.searchItem}
                    onClick={() => {
                      setQuery('');
                      setFocused(false);
                      navigate(tool.path);
                    }}
                  >
                    <span className={styles.searchItemIcon}>{tool.icon}</span>
                    <span className={styles.searchItemTitle}>{tool.name}</span>
                  </button>
                ))}
              </>
            )}

            {filteredSessions.length > 0 && (
              <>
                <div className={styles.searchCategoryLabel}>Conversas Recentes</div>
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    className={styles.searchItem}
                    onClick={() => {
                      setQuery('');
                      setFocused(false);
                      navigate('/chat', { state: { selectSessionId: session.id } });
                    }}
                  >
                    <span className={styles.searchItemIcon} style={{ color: 'var(--text-muted)' }}>
                      <MessagesSquare size={14} />
                    </span>
                    <span className={styles.searchItemTitle}>{session.title}</span>
                  </button>
                ))}
              </>
            )}

            {!hasResults && (
              <div className={styles.searchNoResults}>
                Nenhuma ferramenta ou conversa encontrada
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.headerActions}>
        <button className="btn btn-ghost" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema">
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button className="btn btn-ghost" onClick={handleLogout} title="Sair" style={{ color: 'var(--text-secondary)' }}>
          <LogOut size={17} />
        </button>

        <div 
          className={styles.userProfile} 
          ref={dropdownRef} 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
        >
          <div className={styles.avatar}>
            {user?.avatar ? (
              <img src={user.avatar} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div className={styles.userInfo}>
            <span className={styles.userName}>{user?.name || 'Admin'}</span>
            <span className={styles.userRole}>{user?.role || ''}</span>
          </div>

          {dropdownOpen && (
            <div className={styles.profileDropdownMenu} onClick={(e) => e.stopPropagation()}>
              <div className={styles.dropdownHeader}>
                <span className={styles.dropdownName}>{user?.name || 'Admin'}</span>
                <span className={styles.dropdownEmail}>{user?.email || ''}</span>
              </div>
              <div className={styles.dropdownDivider} />
              <button className={styles.dropdownItem} onClick={() => { setDropdownOpen(false); navigate('/profile'); }}>
                <User size={14} />
                <span>Meu Perfil</span>
              </button>
              <button className={styles.dropdownItem} onClick={() => { setDropdownOpen(false); navigate('/settings'); }}>
                <Settings size={14} />
                <span>Configurações</span>
              </button>
              {isAdmin && (
                <button className={styles.dropdownItem} onClick={() => { setDropdownOpen(false); navigate('/users'); }}>
                  <ShieldCheck size={14} />
                  <span>Controle de Acesso</span>
                </button>
              )}
              <div className={styles.dropdownDivider} />
              <button className={`${styles.dropdownItem} ${styles.dropdownItemLogout}`} onClick={() => { setDropdownOpen(false); handleLogout(); }}>
                <LogOut size={14} />
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* ----------------------------------------------------------------
   Animated Outlet (Framer Motion)
---------------------------------------------------------------- */
const AnimatedOutlet = () => {
  const location = useLocation();
  const element = useOutlet();

  return (
    <AnimatePresence mode="wait" initial={false}>
      {element ? (
        <PageTransition key={location.pathname}>
          {React.cloneElement(element, { key: location.pathname })}
        </PageTransition>
      ) : null}
    </AnimatePresence>
  );
};

/* ----------------------------------------------------------------
   Layout
---------------------------------------------------------------- */
const Layout = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const location = useLocation();
  const isChatPage = location.pathname === '/chat' || location.pathname === '/teams';
  const isTeamsPage = location.pathname === '/teams';

  const [isSidebarCollapsedState, setIsSidebarCollapsedState] = React.useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const isSidebarCollapsed = isTeamsPage ? true : isSidebarCollapsedState;

  const toggleSidebar = () => {
    if (isTeamsPage) return; // Prevent toggling when forced collapsed
    setIsSidebarCollapsedState(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  React.useEffect(() => {
    const handleThemeChange = () => {
      const saved = localStorage.getItem('theme');
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      const isDark = saved === 'dark' || (!saved && prefersDark);
      setIsDarkMode(isDark);
      if (isDark) {
        document.documentElement.setAttribute('data-theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
      }
    };
    handleThemeChange();
    window.addEventListener('theme-change', handleThemeChange);
    return () => window.removeEventListener('theme-change', handleThemeChange);
  }, []);

  const toggleTheme = () => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const currentIsDark = saved === 'dark' || (!saved && prefersDark);
    localStorage.setItem('theme', currentIsDark ? 'light' : 'dark');
    window.dispatchEvent(new Event('theme-change'));
  };

  return (
    <div className={styles.appContainer}>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className={styles.mainContent}>
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <div className={`${styles.pageContent} ${isChatPage ? styles.chatPageContainer : ''}`}>
          <AnimatedOutlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
