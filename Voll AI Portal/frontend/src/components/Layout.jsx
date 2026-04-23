import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import {
  LayoutDashboard,
  MessageSquare,
  MessageCircle,
  Zap,
  RefreshCcw,
  History,
  Settings,
  Search,
  Bot,
  Sun,
  Moon
} from 'lucide-react';

const Sidebar = () => {
  const navItems = [
    { name: 'Dashboard', path: '/', icon: <LayoutDashboard size={20} /> },
    { name: 'Chat IA', path: '/chat', icon: <MessageCircle size={20} /> },
    { name: 'Fluxos de Chatbot', path: '/chatbots', icon: <Bot size={20} /> },
    { name: 'Automações', path: '/automations', icon: <Zap size={20} /> },
    { name: 'Gerador de Respostas', path: '/responses', icon: <MessageSquare size={20} /> },
    { name: 'Histórico', path: '/history', icon: <History size={20} /> },
    { name: 'Configurações', path: '/settings', icon: <Settings size={20} /> },
  ];

  return (
    <div className="sidebar">
      <div className="sidebar-logo">
        <img src="../images/RemoveFundo Icon.png" alt="Voll Logo" className="logo-img" />
        <span>Voll Intelligence</span>
      </div>

      <div className="sidebar-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            {item.icon}
            <span>{item.name}</span>
          </NavLink>
        ))}
      </div>
    </div>
  );
};

const Header = ({ isDarkMode, toggleTheme }) => {
  return (
    <div className="header">
      <div className="header-search">
        <Search size={18} />
        <input type="text" placeholder="Pesquisar ferramentas, prompts..." />
      </div>

      <div className="header-actions">
        <button className="btn btn-outline" onClick={toggleTheme} title="Alternar Tema" style={{ padding: '10px' }}>
          {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        <button className="btn btn-primary" onClick={() => window.location.reload()}>
          <RefreshCcw size={16} />
          Nova geração
        </button>

        <div className="user-profile">
          <div className="avatar">AD</div>
          <span style={{ fontWeight: 500, fontSize: '0.9rem', color: 'var(--color-dark)' }}>Admin User</span>
        </div>
      </div>
    </div>
  );
};

const Layout = () => {
  const [isDarkMode, setIsDarkMode] = React.useState(false);

  React.useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      setIsDarkMode(true);
      document.documentElement.setAttribute('data-theme', 'dark');
    }
  }, []);

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    if (!isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
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
