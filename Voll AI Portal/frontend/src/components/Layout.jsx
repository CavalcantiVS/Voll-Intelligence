import React, { useState, useEffect, useRef, useMemo } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
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
import { useAuth } from '../contexts/AuthContext';

/* ----------------------------------------------------------------
   Sidebar
---------------------------------------------------------------- */
const Sidebar = ({ isCollapsed, toggleSidebar }) => {
  const { user } = useAuth();
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
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
        title={isCollapsed ? item.name : undefined}
      >
        {item.icon}
        {!isCollapsed && <span>{item.name}</span>}
      </NavLink>
    ));

  return (
    <div className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="../images/RemoveFundo Icon.png" alt="Voll" className="logo-img" />
        {!isCollapsed && <span>Voll Intelligence</span>}
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {renderGroup(mainItems)}

        <div className="nav-section-label">Ferramentas</div>
        {renderGroup(toolItems)}

        <div className="nav-section-label">Sistema</div>
        {renderGroup(systemItems)}

        <button 
          className="sidebar-toggle-btn" 
          onClick={toggleSidebar}
          title={isCollapsed ? "Expandir Menu" : "Recolher Menu"}
          type="button"
        >
          {isCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          {!isCollapsed && <span>Recolher Menu</span>}
        </button>
      </nav>
    </div>
  );
};

/* ----------------------------------------------------------------
   Header
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
    <div className="header">
      <div className="header-search-wrapper" ref={searchRef}>
        <div className="header-search">
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
          <div className="search-results-dropdown">
            {filteredTools.length > 0 && (
              <>
                <div className="search-category-label">Ferramentas</div>
                {filteredTools.map((tool) => (
                  <button
                    key={tool.path}
                    className="search-item"
                    onClick={() => {
                      setQuery('');
                      setFocused(false);
                      navigate(tool.path);
                    }}
                  >
                    <span className="search-item-icon">{tool.icon}</span>
                    <span className="search-item-title">{tool.name}</span>
                  </button>
                ))}
              </>
            )}

            {filteredSessions.length > 0 && (
              <>
                <div className="search-category-label">Conversas Recentes</div>
                {filteredSessions.map((session) => (
                  <button
                    key={session.id}
                    className="search-item"
                    onClick={() => {
                      setQuery('');
                      setFocused(false);
                      navigate('/chat', { state: { selectSessionId: session.id } });
                    }}
                  >
                    <span className="search-item-icon" style={{ color: 'var(--text-muted)' }}>
                      <MessagesSquare size={14} />
                    </span>
                    <span className="search-item-title">{session.title}</span>
                  </button>
                ))}
              </>
            )}

            {!hasResults && (
              <div className="search-no-results">
                Nenhuma ferramenta ou conversa encontrada
              </div>
            )}
          </div>
        )}
      </div>

      <div className="header-actions">
        <button className="btn btn-ghost" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema">
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button className="btn btn-ghost" onClick={handleLogout} title="Sair" style={{ color: 'var(--text-secondary)' }}>
          <LogOut size={17} />
        </button>

        <div 
          className="user-profile" 
          ref={dropdownRef} 
          onClick={() => setDropdownOpen(!dropdownOpen)}
          style={{ position: 'relative', cursor: 'pointer', userSelect: 'none' }}
        >
          <div className="avatar">
            {user?.avatar ? (
              <img src={user.avatar} alt="User Avatar" style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }} />
            ) : (
              initials
            )}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{user?.name || 'Admin'}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.role || ''}</span>
          </div>

          {dropdownOpen && (
            <div className="profile-dropdown-menu" onClick={(e) => e.stopPropagation()}>
              <div className="dropdown-header">
                <span className="dropdown-name">{user?.name || 'Admin'}</span>
                <span className="dropdown-email">{user?.email || ''}</span>
              </div>
              <div className="dropdown-divider" />
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/profile'); }}>
                <User size={14} />
                <span>Meu Perfil</span>
              </button>
              <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/settings'); }}>
                <Settings size={14} />
                <span>Configurações</span>
              </button>
              {isAdmin && (
                <button className="dropdown-item" onClick={() => { setDropdownOpen(false); navigate('/users'); }}>
                  <ShieldCheck size={14} />
                  <span>Controle de Acesso</span>
                </button>
              )}
              <div className="dropdown-divider" />
              <button className="dropdown-item logout" onClick={() => { setDropdownOpen(false); handleLogout(); }}>
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
   Layout
---------------------------------------------------------------- */
const Layout = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);
  const location = useLocation();
  const isChatPage = location.pathname === '/chat' || location.pathname === '/teams';

  const [isSidebarCollapsed, setIsSidebarCollapsed] = React.useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
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
    <div className="app-container">
      <style>{`
        .sidebar {
          transition: width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1) !important;
        }
        .sidebar.collapsed {
          width: 72px !important;
          min-width: 72px !important;
        }
        .sidebar.collapsed .sidebar-logo span {
          display: none !important;
        }
        .sidebar.collapsed .sidebar-logo {
          justify-content: center !important;
          padding: 20px 0 16px !important;
        }
        .sidebar.collapsed .nav-item {
          justify-content: center !important;
          padding: 12px 0 !important;
          gap: 0 !important;
        }
        .sidebar.collapsed .nav-item span {
          display: none !important;
        }
        .sidebar.collapsed .nav-section-label {
          height: 1px !important;
          background-color: var(--sidebar-border) !important;
          margin: 12px 14px !important;
          padding: 0 !important;
          font-size: 0 !important;
          overflow: hidden !important;
        }
        .sidebar-toggle-btn {
          background: none;
          border: none;
          border-top: 1px solid var(--sidebar-border);
          color: var(--text-secondary);
          padding: 14px 20px;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          font-size: 0.825rem;
          font-weight: 500;
          transition: background-color 0.15s ease, color 0.15s ease;
          margin-top: auto;
        }
        .sidebar-toggle-btn:hover {
          background-color: var(--bg-page);
          color: var(--voll-red);
        }
        .sidebar.collapsed .sidebar-toggle-btn {
          justify-content: center !important;
          padding: 14px 0 !important;
          gap: 0 !important;
        }
      `}</style>
      <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />
      <div className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <div className={`page-content${isChatPage ? ' chat-page-container' : ''}`}>
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
