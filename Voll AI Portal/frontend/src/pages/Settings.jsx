import React from 'react';
import { Settings as SettingsIcon, Save, Database, Shield, Monitor } from 'lucide-react';

const Settings = () => {
  return (
    <div className="generator-page">
      <div className="dashboard-header">
        <h1>Configurações do Sistema</h1>
        <p>Gerencie as preferências da sua conta e da plataforma Voll AI.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card" style={{ cursor: 'pointer' }}>
          <div className="stat-icon primary"><Monitor size={24} /></div>
          <div className="stat-info">
            <h3>Interface</h3>
            <p>Tema escuro ativado</p>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', opacity: 0.7 }}>
          <div className="stat-icon secondary"><Database size={24} /></div>
          <div className="stat-info">
            <h3>Bases de Conhecimento</h3>
            <p>Em breve</p>
          </div>
        </div>
        <div className="stat-card" style={{ cursor: 'pointer', opacity: 0.7 }}>
          <div className="stat-icon primary"><Shield size={24} /></div>
          <div className="stat-info">
            <h3>Privacidade</h3>
            <p>Regras de DLP</p>
          </div>
        </div>
      </div>

      <div className="form-card" style={{ marginTop: '24px' }}>
        <h3>Perfil</h3>
        <p style={{ color: 'var(--color-text-light)', marginBottom: '20px', fontSize: '0.85rem' }}>
          As configurações da conta são gerenciadas globalmente pelo sistema de SSO.
        </p>

        <form>
          <div className="form-group">
            <label>Nome</label>
            <input type="text" className="form-control" value="Admin User" disabled />
          </div>

          <div className="form-group">
            <label>E-mail</label>
            <input type="email" className="form-control" value="admin@voll.com" disabled />
          </div>

          <div className="form-group">
            <label>Nível de Acesso</label>
            <input type="text" className="form-control" value="Administrador Geral" disabled />
          </div>

          <button type="button" className="btn btn-primary" disabled>
            <Save size={18} />
            Salvar Configurações
          </button>
        </form>
      </div>
    </div>
  );
};

export default Settings;
