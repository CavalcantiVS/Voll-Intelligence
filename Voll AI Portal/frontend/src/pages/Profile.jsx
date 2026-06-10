import React, { useState, useEffect, useRef } from 'react';
import { Camera, Mail, User, Key, Shield, CheckCircle2, AlertCircle, ShieldCheck, Cpu, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMsal } from '@azure/msal-react';

const screenLabels = {
  '/': 'Dashboard',
  '/chat': 'Assistente Voll',
  '/chatbots': 'Fluxos de Atendimento',
  '/responses': 'Assistente de Redação',
  '/automations': 'Automação Interna',
  '/docs': 'Gerador de Documentos',
  '/refine': 'Refinamento de Textos',
  '/prompts': 'Biblioteca de Prompts',
  '/history': 'Histórico',
  '/settings': 'Configurações',
  '/users': 'Controle de Acesso',
};

const Profile = () => {
  const { user, token, updateUser } = useAuth();
  const { accounts } = useMsal();
  const avatarInputRef = useRef(null);

  const [nameInput, setNameInput] = useState(user?.name || '');
  const [passwordInput, setPasswordInput] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [avatarBase64, setAvatarBase64] = useState(user?.avatar || '');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const [status, setStatus] = useState(null); // 'saving' | 'success' | 'error'
  const [errorMessage, setErrorMessage] = useState('');

  // Sincroniza estado com o contexto do usuário
  useEffect(() => {
    if (user) {
      setNameInput(user.name || '');
      setAvatarBase64(user.avatar || '');
    }
  }, [user]);

  const msAccount = accounts?.[0] || null;
  const isMsUser = !!msAccount;

  const handleAvatarClick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        setErrorMessage('A imagem selecionada deve ter no máximo 2MB.');
        setStatus('error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarBase64(reader.result);
        setStatus(null);
        setErrorMessage('');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setStatus('saving');
    setErrorMessage('');

    if (passwordInput && passwordInput !== confirmPassword) {
      setErrorMessage('As senhas digitadas não coincidem.');
      setStatus('error');
      return;
    }

    try {
      const body = {};
      if (!isMsUser && nameInput.trim()) {
        body.name = nameInput.trim();
      }
      if (avatarBase64 !== user?.avatar) {
        body.avatar = avatarBase64;
      }
      if (!isMsUser && passwordInput.trim()) {
        body.password = passwordInput.trim();
      }

      if (Object.keys(body).length === 0) {
        setStatus('success');
        setTimeout(() => setStatus(null), 3000);
        return;
      }

      const res = await fetch('http://localhost:3001/api/auth/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(body)
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Falha ao atualizar o perfil.');
      }

      updateUser(data.user);
      setStatus('success');
      setPasswordInput('');
      setConfirmPassword('');
      setTimeout(() => setStatus(null), 3000);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Ocorreu um erro ao salvar o perfil.');
      setStatus('error');
    }
  };

  // Exibição de dados e iniciais
  const displayName = user?.name || msAccount?.name || 'Colaborador';
  const displayEmail = user?.email || msAccount?.username || '';
  const displayRole = user?.role || 'Colaborador';
  const displayDept = user?.department || 'Atendimento';
  const initials = displayName.slice(0, 2).toUpperCase();

  // Módulos habilitados
  const allowedScreens = user?.allowed_screens || [];

  return (
    <div className="generator-page">
      <div className="dashboard-header">
        <h1>Meu Perfil</h1>
        <p>Gerencie seus dados pessoais, foto de avatar e credenciais de acesso.</p>
      </div>

      <div className="generator-grid" style={{ marginTop: '24px' }}>
        
        {/* LADO ESQUERDO: Cartão Principal do Perfil */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="form-card" style={{ position: 'relative', overflow: 'hidden' }}>
            {/* Header decorativo do card */}
            <div style={{
              height: '80px',
              margin: '-24px -24px 0 -24px',
              background: 'linear-gradient(135deg, var(--voll-red) 0%, #a8001d 100%)',
              opacity: 0.85,
              position: 'relative'
            }} />

            {/* Seção do Avatar com upload */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-40px', marginBottom: '24px', position: 'relative', zIndex: 1 }}>
              <div 
                onClick={handleAvatarClick}
                style={{
                  width: '96px',
                  height: '96px',
                  borderRadius: '50%',
                  backgroundColor: 'var(--bg-surface)',
                  border: '4px solid var(--bg-surface)',
                  boxShadow: 'var(--shadow-md)',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justify: 'center'
                }}
                className="profile-avatar-container"
              >
                {avatarBase64 ? (
                  <img src={avatarBase64} alt="Avatar" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-subtle)', color: 'var(--voll-red)', fontSize: '2rem', fontWeight: 700 }}>
                    {initials}
                  </div>
                )}
                
                {/* Overlay Hover */}
                <div style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: 'rgba(0,0,0,0.5)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.2s ease',
                  color: '#fff'
                }} className="profile-avatar-overlay">
                  <Camera size={24} />
                </div>
              </div>
              
              <input 
                type="file" 
                ref={avatarInputRef} 
                style={{ display: 'none' }} 
                accept="image/*" 
                onChange={handleAvatarChange} 
              />

              <h2 style={{ marginTop: '16px', fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)' }}>{displayName}</h2>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{displayEmail}</span>
            </div>

            {/* Detalhes do Usuário */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div style={{ display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Nível de Acesso</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{displayRole}</span>
                </div>
                <div style={{ flex: 1, padding: '12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', backgroundColor: 'var(--bg-page)' }}>
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>Departamento</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{displayDept}</span>
                </div>
              </div>

              {isMsUser && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  backgroundColor: 'rgba(0, 120, 212, 0.08)',
                  border: '1px solid rgba(0, 120, 212, 0.2)',
                  borderRadius: 'var(--radius-md)',
                  padding: '12px 16px',
                  color: '#0078d4'
                }}>
                  <svg width="18" height="18" viewBox="0 0 21 21" fill="none" style={{ flexShrink: 0 }}><rect x="1" y="1" width="9" height="9" fill="#0078d4" /><rect x="11" y="1" width="9" height="9" fill="#0078d4" /><rect x="1" y="11" width="9" height="9" fill="#0078d4" /><rect x="11" y="11" width="9" height="9" fill="#0078d4" /></svg>
                  <div style={{ fontSize: '0.8rem', lineHeight: 1.3 }}>
                    Autenticado via <strong>Microsoft SSO (Entra ID)</strong>. Suas preferências de nome e e-mail são administradas corporativamente.
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Permissões do Usuário (Módulos Habilitados) */}
          <div className="form-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <ShieldCheck size={20} style={{ color: 'var(--voll-red)' }} />
              <h3 style={{ margin: 0 }}>Módulos Autorizados</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
              Abaixo estão listadas as telas e ferramentas que você tem permissão para acessar nesta plataforma.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {allowedScreens.length === 0 ? (
                <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>Nenhuma permissão específica configurada. Acesso básico habilitado.</span>
              ) : (
                allowedScreens.map((screen) => (
                  <span 
                    key={screen}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      fontSize: '0.8rem',
                      fontWeight: 500,
                      backgroundColor: 'var(--bg-subtle)',
                      border: '1px solid var(--border)',
                      borderRadius: '99px',
                      color: 'var(--text-primary)'
                    }}
                  >
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--voll-red)' }} />
                    {screenLabels[screen] || screen}
                  </span>
                ))
              )}
            </div>
          </div>

        </div>

        {/* LADO DIREITO: Edição de Formulário e Senha */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          <div className="form-card">
            <h3>Dados Pessoais e Segurança</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '20px', fontSize: '0.85rem' }}>
              Mantenha suas informações atualizadas. Usuários locais podem redefinir suas senhas nesta seção.
            </p>

            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              
              {/* Nome */}
              <div className="form-group">
                <label htmlFor="profile-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <User size={14} /> Nome Completo
                </label>
                <input 
                  type="text" 
                  id="profile-name"
                  className="form-control" 
                  value={isMsUser ? displayName : nameInput} 
                  onChange={(e) => setNameInput(e.target.value)}
                  disabled={isMsUser} 
                  style={{ cursor: isMsUser ? 'not-allowed' : 'text' }}
                  required
                />
              </div>

              {/* E-mail (Sempre desabilitado) */}
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Mail size={14} /> E-mail Corporativo
                </label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={displayEmail} 
                  disabled 
                  style={{ cursor: 'not-allowed' }} 
                />
              </div>

              {/* Área de Senha (apenas local) */}
              {!isMsUser ? (
                <>
                  <hr style={{ border: 0, borderTop: '1px solid var(--border)', margin: '8px 0' }} />
                  
                  <div className="form-group">
                    <label htmlFor="profile-password" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} /> Nova Senha (mínimo 6 caracteres)
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showPassword ? "text" : "password"} 
                        id="profile-password"
                        className="form-control" 
                        value={passwordInput} 
                        onChange={(e) => setPasswordInput(e.target.value)}
                        placeholder="Digite para alterar..."
                        minLength={6}
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label htmlFor="profile-confirm-password" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Key size={14} /> Confirmar Nova Senha
                    </label>
                    <div style={{ position: 'relative' }}>
                      <input 
                        type={showConfirmPassword ? "text" : "password"} 
                        id="profile-confirm-password"
                        className="form-control" 
                        value={confirmPassword} 
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="Confirme a nova senha..."
                        style={{ paddingRight: '40px' }}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          color: 'var(--text-muted)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          padding: 0
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                </>
              ) : null}

              {/* Alertas */}
              {status === 'error' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: 'var(--voll-red)',
                  backgroundColor: 'var(--voll-red-soft)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem'
                }}>
                  <AlertCircle size={16} style={{ flexShrink: 0 }} />
                  <span>{errorMessage}</span>
                </div>
              )}

              {status === 'success' && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  color: '#16a34a',
                  backgroundColor: 'rgba(22, 163, 74, 0.08)',
                  border: '1px solid rgba(22, 163, 74, 0.2)',
                  padding: '12px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.85rem'
                }}>
                  <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                  <span>Perfil atualizado com sucesso! As mudanças já estão ativas.</span>
                </div>
              )}

              {/* Ação */}
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={status === 'saving'}
                style={{ width: '100%', justifyContent: 'center', fontWeight: 600, marginTop: '8px' }}
              >
                {status === 'saving' ? 'Salvando Alterações...' : 'Salvar Alterações'}
              </button>

            </form>
          </div>

          {/* Adicionando alguns estilos internos para o hover do avatar */}
          <style>{`
            .profile-avatar-container:hover .profile-avatar-overlay {
              opacity: 1 !important;
            }
          `}</style>
        </div>

      </div>
    </div>
  );
};

export default Profile;
