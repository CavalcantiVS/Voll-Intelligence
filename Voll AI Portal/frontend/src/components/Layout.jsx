import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
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
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ----------------------------------------------------------------
   Sidebar
---------------------------------------------------------------- */
const Sidebar = () => {
  const mainItems = [
    { name: 'Dashboard',            path: '/',            icon: <LayoutDashboard size={18} /> },
    { name: 'Assistente Voll',      path: '/chat',        icon: <MessagesSquare  size={18} /> },
  ];

  const toolItems = [
    { name: 'Fluxos de Atendimento', path: '/chatbots',    icon: <LayoutTemplate size={18} /> },
    { name: 'Assistente de Redação', path: '/responses',   icon: <Headset        size={18} /> },
    { name: 'Automação Interna',     path: '/automations', icon: <Settings       size={18} /> },
  ];

  const systemItems = [
    { name: 'Histórico',     path: '/history',  icon: <History  size={18} /> },
    { name: 'Configurações', path: '/settings', icon: <Settings size={18} /> },
  ];

  const renderGroup = (items) =>
    items.map((item) => (
      <NavLink
        key={item.path}
        to={item.path}
        end={item.path === '/'}
        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
      >
        {item.icon}
        <span>{item.name}</span>
      </NavLink>
    ));

  return (
    <div className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <img src="../images/RemoveFundo Icon.png" alt="Voll" className="logo-img" />
        <span>Portal Voll</span>
      </div>

      {/* Navigation */}
      <nav className="sidebar-nav">
        {renderGroup(mainItems)}

        <div className="nav-section-label">Ferramentas</div>
        {renderGroup(toolItems)}

        <div className="nav-section-label">Sistema</div>
        {renderGroup(systemItems)}
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

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const initials = user?.name
    ? user.name.slice(0, 2).toUpperCase()
    : 'AD';

  return (
    <div className="header">
      <div className="header-search">
        <Search size={16} />
        <input type="text" placeholder="Buscar ferramenta ou conversa…" />
      </div>

      <div className="header-actions">
        <button className="btn btn-ghost" onClick={toggleTheme} title="Alternar tema" aria-label="Alternar tema">
          {isDarkMode ? <Sun size={17} /> : <Moon size={17} />}
        </button>

        <button className="btn btn-ghost" onClick={handleLogout} title="Sair" style={{ color: 'var(--text-secondary)' }}>
          <LogOut size={17} />
        </button>

        <div className="user-profile">
          <div className="avatar">{initials}</div>
          <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
            <span style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>{user?.name || 'Admin'}</span>
            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{user?.role || ''}</span>
          </div>
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

  React.useEffect(() => {
    const saved = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (saved === 'dark' || (!saved && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode((prev) => {
      const next = !prev;
      if (next) {
        document.documentElement.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
      } else {
        document.documentElement.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
      }
      return next;
    });
  };

  return (
    <div className="app-container">
      <Sidebar />
      <div className="main-content">
        <Header isDarkMode={isDarkMode} toggleTheme={toggleTheme} />
        <div className="page-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default Layout;
