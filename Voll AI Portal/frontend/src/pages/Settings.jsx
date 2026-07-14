import React, { useState, useEffect } from 'react';
import { Save, Database, Shield, Monitor, Trash2, CheckCircle2, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Settings = () => {
  const navigate = useNavigate();

  
  // Estados da UI e Formulário
  const [theme, setTheme] = useState('light');
  const [dlpLevel, setDlpLevel] = useState('rigoroso');
  const [aiModel, setAiModel] = useState('gpt-4o');
  const [aiTemp, setAiTemp] = useState(0.7);
  const [saveStatus, setSaveStatus] = useState(null);

  // Carrega a configuração na montagem e escuta mudanças externas (como do cabeçalho)
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

  // Dispara evento customizado de mudança de tema para alternar o modo da interface instantaneamente
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
      
      // Dispara caso tenha sido alternado via seletores
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

      {/* Cartões de configuração interativos */}
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

      {/* Layout de formulários */}
      <div className="generator-grid" style={{ marginTop: '24px' }}>
        
        {/* Lado Esquerdo: Preferências do Sistema */}
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

            {/* Nível DLP */}
            <div className="form-group">
              <label htmlFor="set-dlp">Filtro de Privacidade (DLP)</label>
              <select id="set-dlp" className="form-control" value={dlpLevel} onChange={(e) => setDlpLevel(e.target.value)}>
                <option value="rigoroso">Rígido (Bloqueia e mascara CPF/CNPJ)</option>
                <option value="informativo">Informativo (Alerta na tela, envia dado original)</option>
                <option value="desativado">Desativado (Sem alertas ou filtragem)</option>
              </select>
            </div>

            {/* Modelo de IA */}
            <div className="form-group">
              <label htmlFor="set-model">Modelo de Linguagem (LLM)</label>
              <select id="set-model" className="form-control" value={aiModel} onChange={(e) => setAiModel(e.target.value)}>
                <option value="gpt-4o">Voll Engine Default (GPT-4o)</option>
                <option value="gpt-4o-mini">Voll Engine Light (GPT-4o Mini)</option>
                <option value="gemini-1.5-flash">Voll Engine Experimental (Gemini)</option>
              </select>
            </div>

            {/* Slider de Temperatura da IA */}
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

        {/* Lado Direito: Atalho do Cartão de Perfil e Ações de Perigo */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Cartão de Atalho do Perfil */}
          <div className="form-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', padding: '30px 24px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '50%',
              background: 'var(--voll-red-soft)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--voll-red)',
              marginBottom: '16px'
            }}>
              <User size={36} />
            </div>
            
            <h3 style={{ margin: '0 0 8px 0' }}>Meu Perfil</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.85rem', maxWidth: '280px', lineHeight: 1.4 }}>
              Gerencie sua foto de perfil, altere seu nome de exibição, configure sua senha e confira seus módulos autorizados no Portal Voll.
            </p>

            <button 
              type="button" 
              className="btn btn-primary" 
              onClick={() => navigate('/profile')}
              style={{ width: '100%', justifyContent: 'center', fontWeight: 600 }}
            >
              Acessar Meu Perfil
            </button>
          </div>

          {/* Cartão da Zona de Perigo */}
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
