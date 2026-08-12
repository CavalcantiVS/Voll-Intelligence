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
  KanbanSquare,
  Bell,
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../api';
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
    if (path === '/' || path === '/profile' || path === '/teams' || path === '/kanban') return true;
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
    { name: 'Kanban Board',          path: '/kanban',      icon: <KanbanSquare   size={18} /> },
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
        <img src="/images/RemoveFundo Icon.png" alt="Voll" className={styles.logoImg} />
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
  const [notifDropdownOpen, setNotifDropdownOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const notifRef = useRef(null);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await fetch(`${API_URL}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchNotifications();
      const interval = setInterval(fetchNotifications, 30000); // poll every 30s
      return () => clearInterval(interval);
    }
  }, [user]);

  const handleReadNotification = async (notif) => {
    try {
      const token = localStorage.getItem('token');
      if (!notif.is_read) {
        await fetch(`${API_URL}/api/notifications/${notif.id}/read`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` }
        });
        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, is_read: true } : n));
      }
      setNotifDropdownOpen(false);
      if (notif.link) {
        navigate(notif.link);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleReadAll = async () => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`${API_URL}/api/notifications/read-all`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const handleFocus = async () => {
    setFocused(true);
    try {
      const res = await fetch(`${API_URL}/api/chat/sessions`);
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
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifDropdownOpen(false);
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
    { name: 'Kanban Board',          path: '/kanban',      icon: <KanbanSquare   size={14} /> },
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
        <div className={styles.notificationWrapper} ref={notifRef}>
          <button 
            className="btn btn-ghost" 
            onClick={() => { setNotifDropdownOpen(!notifDropdownOpen); setDropdownOpen(false); }} 
            title="Notificações"
            style={{ position: 'relative' }}
          >
            <Bell size={17} />
            {unreadCount > 0 && (
              <span className={styles.notificationBadge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>
          
          {notifDropdownOpen && (
            <div className={styles.notificationDropdown}>
              <div className={styles.notifHeader}>
                <h3>Notificações</h3>
                {unreadCount > 0 && (
                  <button className={styles.notifReadAll} onClick={handleReadAll}>
                    Marcar todas como lidas
                  </button>
                )}
              </div>
              <div className={styles.notifList}>
                {notifications.length === 0 ? (
                  <div className={styles.notifEmpty}>Sem notificações no momento.</div>
                ) : (
                  notifications.map(notif => (
                    <div 
                      key={notif.id} 
                      className={`${styles.notifItem} ${notif.is_read ? styles.notifRead : ''}`}
                      onClick={() => handleReadNotification(notif)}
                    >
                      <div className={styles.notifIcon}>
                        <Bell size={14} />
                      </div>
                      <div className={styles.notifContent}>
                        <div className={styles.notifTitle}>{notif.title}</div>
                        <div className={styles.notifMessage}>{notif.message}</div>
                        <div className={styles.notifTime}>{new Date(notif.created_at).toLocaleDateString()} {new Date(notif.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      </div>
                      {!notif.is_read && <div className={styles.notifUnreadDot} />}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <button className="btn btn-ghost" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema">
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button className="btn btn-ghost" onClick={handleLogout} title="Sair" style={{ color: 'var(--text-secondary)' }}>
          <LogOut size={17} />
        </button>

        <div 
          className={styles.userProfile} 
          ref={dropdownRef} 
          onClick={() => { setDropdownOpen(!dropdownOpen); setNotifDropdownOpen(false); }}
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
  const [isZenMode, setIsZenMode] = React.useState(false);

  React.useEffect(() => {
    const handleZen = () => setIsZenMode(prev => !prev);
    window.addEventListener('toggle-zen-mode', handleZen);
    return () => window.removeEventListener('toggle-zen-mode', handleZen);
  }, []);
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
      {!isZenMode && <Sidebar isCollapsed={isSidebarCollapsed} toggleSidebar={toggleSidebar} />}
      <div className={styles.mainContent}>
        {!isZenMode && <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />}
        <div className={`${styles.pageContent} ${isChatPage ? styles.chatPageContainer : ''}`}>
          <AnimatedOutlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
