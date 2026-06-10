import React, { useState, useEffect } from 'react';
import { Save, Database, Shield, Monitor, Trash2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMsal } from '@azure/msal-react';

const Settings = () => {
  const { user } = useAuth();
  const { accounts } = useMsal();
  
  // Detecta se o login foi via Microsoft SSO
  const msAccount = accounts?.[0] || null;
  const isMsUser = !!msAccount;
  
  // Avatar: prioriza o do DB (photo uploaded), depois o da Microsoft em memória, depois as iniciais
  const displayAvatar = user?.avatar || user?.msAvatar || null;
  const displayName = user?.name || msAccount?.name || '';
  const displayEmail = user?.email || msAccount?.username || '';
  const displayRole = user?.role || '';

  
  // UI & Form states
  const [theme, setTheme] = useState('light');
  const [dlpLevel, setDlpLevel] = useState('rigoroso');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiTemp, setAiTemp] = useState(0.7);
  const [saveStatus, setSaveStatus] = useState(null);

  // Load configuration on mount and listen to external changes (like from header)
  useEffect(() => {
    const loadConfig = () => {
      const savedTheme = localStorage.getItem('theme') || 'light';
      const savedDlp = localStorage.getItem('dlp_level') || 'rigoroso';
      const savedModel = localStorage.getItem('ai_model') || 'gpt-4o';
      const savedTemp = localStorage.getItem('ai_temp') || '0.7';

      setTheme(savedTheme);
      setDlpLevel(savedDlp);
      setAiModel(savedModel);
      setAiTemp(parseFloat(savedTemp));
    };

    loadConfig();

    window.addEventListener('theme-change', loadConfig);
    return () => window.removeEventListener('theme-change', loadConfig);
  }, []);

  // Dispatch custom theme change event to toggle interface mode instantly
  const handleThemeToggle = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    localStorage.setItem('theme', nextTheme);
    window.dispatchEvent(new Event('theme-change'));
  };

  const handleSave = (e) => {
    e.preventDefault();
    setSaveStatus('saving');

    setTimeout(() => {
      localStorage.setItem('theme', theme);
      localStorage.setItem('dlp_level', dlpLevel);
      localStorage.setItem('ai_model', aiModel);
      localStorage.setItem('ai_temp', aiTemp.toString());
      
      // Dispatch in case it was toggled via selectors
      window.dispatchEvent(new Event('theme-change'));
      
      setSaveStatus('success');
      setTimeout(() => setSaveStatus(null), 3000);
    }, 600);
  };

  const handleResetData = () => {
    if (!window.confirm('Tem certeza de que deseja redefinir todas as preferências da plataforma para o padrão? (Seu histórico de interações no banco de dados não será afetado)')) return;
    
    localStorage.clear();
    setTheme('light');
    setDlpLevel('rigoroso');
    setAiModel('gpt-4o');
    setAiTemp(0.7);
    window.dispatchEvent(new Event('theme-change'));

    alert('Preferências da plataforma redefinidas com sucesso.');
  };

  return (
    <div className="generator-page">
      <div className="dashboard-header">
        <h1>Configurações do Sistema</h1>
        <p>Gerencie as preferências da sua conta e da plataforma Voll Intelligence.</p>
      </div>

      {/* Interactive config cards */}
      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }} onClick={handleThemeToggle} title="Clique para alternar o tema">
          <div className="stat-icon primary"><Monitor size={22} /></div>
          <div className="stat-info">
            <h3>Tema Visual</h3>
            <p>Clique para usar tema {theme === 'dark' ? 'Claro' : 'Escuro'}</p>
          </div>
        </div>

        <div className="stat-card" style={{ opacity: dlpLevel === 'desativado' ? 0.6 : 1 }}>
          <div className="stat-icon secondary"><Shield size={22} /></div>
          <div className="stat-info">
            <h3>Privacidade DLP</h3>
            <p style={{ textTransform: 'capitalize' }}>Modo: {dlpLevel}</p>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon primary"><Database size={22} /></div>
          <div className="stat-info">
            <h3>Motor de IA</h3>
            <p style={{ textTransform: 'uppercase' }}>{aiModel}</p>
          </div>
        </div>
      </div>

      {/* Forms layout */}
      <div className="generator-grid" style={{ marginTop: '24px' }}>
        
        {/* Left Side: System Preferences */}
        <div className="form-card">
          <h3>Preferências da Plataforma</h3>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
            Ajuste a segurança e comportamento das consultas realizadas com IA.
          </p>

          <form onSubmit={handleSave}>
            <div className="form-group">
              <label htmlFor="set-theme">Tema de Interface</label>
              <select 
                id="set-theme" 
                className="form-control" 
                value={theme} 
                onChange={(e) => {
                  const nextTheme = e.target.value;
                  setTheme(nextTheme);
                  localStorage.setItem('theme', nextTheme);
                  window.dispatchEvent(new Event('theme-change'));
                }}
              >
                <option value="light">Tema Claro</option>
                <option value="dark">Tema Escuro</option>
              </select>
            </div>

            {/* DLP Level */}
            <div className="form-group">
              <label htmlFor="set-dlp">Filtro de Privacidade (DLP)</label>
              <select id="set-dlp" className="form-control" value={dlpLevel} onChange={(e) => setDlpLevel(e.target.value)}>
                <option value="rigoroso">Rígido (Bloqueia e mascara CPF/CNPJ)</option>
                <option value="informativo">Informativo (Alerta na tela, envia dado original)</option>
                <option value="desativado">Desativado (Sem alertas ou filtragem)</option>
              </select>
            </div>

            {/* AI Model */}
            <div className="form-group">
              <label htmlFor="set-model">Modelo de Linguagem (LLM)</label>
              <select id="set-model" className="form-control" value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                <option value="gpt-4o">Voll Engine Default (GPT-4o)</option>
                <option value="gpt-4o-mini">Voll Engine Light (GPT-4o Mini)</option>
                <option value="gemini-1.5-flash">Voll Engine Experimental (Gemini)</option>
              </select>
            </div>

            {/* AI Temp Slider */}
            <div className="form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                <label htmlFor="set-temp" style={{ marginBottom: 0 }}>Criatividade da Resposta (Temperatura)</label>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--voll-red)' }}>{aiTemp}</span>
              </div>
              <input
                id="set-temp"
                type="range"
                min="0.2"
                max="1.0"
                step="0.1"
                className="form-control"
                value={aiTemp}
                onChange={(e) => setAiTemp(parseFloat(e.target.value))}
                style={{ padding: '8px 0', cursor: 'pointer', accentColor: 'var(--voll-red)' }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                <span>Precisa/Focada (0.2)</span>
                <span>Equilibrada</span>
                <span>Criativa (1.0)</span>
              </div>
            </div>

            {saveStatus === 'success' && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#16a34a', backgroundColor: 'rgba(22,163,74,0.1)', padding: '10px 14px', borderRadius: 'var(--radius-md)', marginBottom: '16px', fontSize: '0.85rem' }}>
                <CheckCircle2 size={16} />
                <span>Configurações salvas com sucesso!</span>
              </div>
            )}

            <button type="submit" className="btn btn-primary" disabled={saveStatus === 'saving'} style={{ width: '100%', justifyContent: 'center' }}>
              <Save size={18} />
              {saveStatus === 'saving' ? 'Salvando...' : 'Salvar Preferências'}
            </button>
          </form>
        </div>

        {/* Right Side: Profile Info & Danger Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Profile Card */}
          <div className="form-card">
            <h3>Perfil do Colaborador</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
              {isMsUser
                ? 'Informações sincronizadas via Microsoft 365 / Entra ID.'
                : 'Informações do usuário logado no Portal Voll.'}
            </p>

            {/* Avatar + badge de identidade */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px', padding: '16px', background: 'var(--bg-subtle)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
              <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'var(--bg-card)', border: '2px solid var(--border)', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', fontWeight: 700, color: 'var(--voll-red)', flexShrink: 0 }}>
                {displayAvatar
                  ? <img src={displayAvatar} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : displayName.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayName}</div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayEmail}</div>
              </div>
              {isMsUser && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#0078d4', color: '#fff', fontSize: '0.7rem', fontWeight: 600, padding: '4px 8px', borderRadius: '99px', flexShrink: 0 }}>
                  <svg width="10" height="10" viewBox="0 0 21 21" fill="none"><rect x="1" y="1" width="9" height="9" fill="#fff" /><rect x="11" y="1" width="9" height="9" fill="#fff" /><rect x="1" y="11" width="9" height="9" fill="#fff" /><rect x="11" y="11" width="9" height="9" fill="#fff" /></svg>
                  Microsoft SSO
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Nome</label>
              <input type="text" className="form-control" value={displayName} disabled style={{ cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
              <label>E-mail Corporativo</label>
              <input type="email" className="form-control" value={displayEmail} disabled style={{ cursor: 'not-allowed' }} />
            </div>

            <div className="form-group">
              <label>Nível de Acesso</label>
              <input type="text" className="form-control" value={displayRole} disabled style={{ cursor: 'not-allowed' }} />
            </div>

            {isMsUser && (
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '8px' }}>
                ✓ Conta gerenciada pelo Microsoft Entra ID da Voll Solutions.
              </p>
            )}
          </div>

          {/* Danger Zone Card */}
          <div className="form-card" style={{ border: '1px solid rgba(220, 38, 38, 0.2)', backgroundColor: 'rgba(220, 38, 38, 0.01)' }}>
            <h3 style={{ color: 'var(--voll-red)' }}>Zona de Perigo</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
              Ações irreversíveis que afetam apenas as configurações locais deste navegador.
            </p>

            <button type="button" className="btn btn-outline" onClick={handleResetData} style={{ color: 'var(--voll-red)', borderColor: 'rgba(220, 38, 38, 0.3)', width: '100%', justifyContent: 'center' }}>
              <Trash2 size={16} />
              Redefinir Configurações do Navegador
            </button>
          </div>

        </div>

      </div>
    </div>
  );
};

export default Settings;
