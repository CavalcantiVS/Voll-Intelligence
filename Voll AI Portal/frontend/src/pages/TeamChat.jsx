import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, MessageSquarePlus, Send, Loader2, Bot, Edit2, Check, X, ShieldAlert, Paperclip, Mic, MicOff, Share2, Users, Settings, User, CheckCircle2, XCircle } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';

const BACKEND = 'http://localhost:3001';

const TeamChat = () => {
  const { user, token } = useAuth();

  const [invitations, setInvitations] = useState([]);
  const [teams, setTeams] = useState([]);
  const [activeTeam, setActiveTeam] = useState(null);
  const [activeSession, setActiveSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);

  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingTeams, setLoadingTeams] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  // Socket & Presence States
  const [socket, setSocket] = useState(null);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userTeamRole, setUserTeamRole] = useState('membro');

  // Modals States
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);

  // Search Members States
  const [searchEmail, setSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Connect to Socket.io on mount
  useEffect(() => {
    const newSocket = io(BACKEND, {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch initial teams and pending invitations
  useEffect(() => {
    if (token) {
      loadTeams();
      loadInvitations();
    }
  }, [token]);

  // Manage room joining and WebSocket listeners
  useEffect(() => {
    if (!socket || !activeTeam || !user) return;

    // Join team socket room
    socket.emit('join_team', {
      teamId: activeTeam.id,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email
      }
    });

    // Load member list and role
    loadTeamMembers(activeTeam.id);

    // Listen for presence updates
    socket.on('team_online_members', (members) => {
      setOnlineMembers(members);
    });

    // Listen for newly added messages (user or assistant placeholders)
    socket.on('message_added', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Listen for message streaming chunks
    socket.on('message_chunk', ({ messageId, chunk }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content: m.content + chunk }
            : m
        )
      );
    });

    // Listen for completed streaming message
    socket.on('message_complete', ({ messageId, content }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content }
            : m
        )
      );
    });

    // Listen for edited messages
    socket.on('message_edited', ({ messageId, content }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content }
            : m
        )
      );
    });

    return () => {
      socket.emit('leave_team', {
        teamId: activeTeam.id,
        userId: user.id
      });
      socket.off('team_online_members');
      socket.off('message_added');
      socket.off('message_chunk');
      socket.off('message_complete');
      socket.off('message_edited');
    };
  }, [socket, activeTeam, user]);

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load invitations
  const loadInvitations = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/teams/invitations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setInvitations(data);
      }
    } catch (err) {
      console.error('Error loading invitations:', err);
    }
  };

  // Load accepted teams
  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch(`${BACKEND}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeams(data);
        // Automatically select first team if available
        if (data.length > 0 && !activeTeam) {
          selectTeam(data[0]);
        }
      }
    } catch (err) {
      console.error('Error loading teams:', err);
    } finally {
      setLoadingTeams(false);
    }
  };

  // Load team members and user's role
  const loadTeamMembers = async (teamId) => {
    try {
      const res = await fetch(`${BACKEND}/api/teams/${teamId}/members`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeamMembers(data);
        const me = data.find(m => m.id === user?.id);
        if (me) {
          setUserTeamRole(me.papel);
        }
      }
    } catch (err) {
      console.error('Error loading team members:', err);
    }
  };

  // Handle invitation accept
  const handleAcceptInvite = async (invite) => {
    try {
      const res = await fetch(`${BACKEND}/api/teams/invitations/${invite.membership_id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao aceitar convite.');
      
      // Remove invitation and reload teams
      setInvitations(prev => prev.filter(i => i.membership_id !== invite.membership_id));
      await loadTeams();
    } catch (err) {
      alert(err.message);
    }
  };

  // Handle invitation reject
  const handleRejectInvite = async (invite) => {
    if (!window.confirm(`Tem certeza de que deseja recusar o convite para a equipe "${invite.team_name}"?`)) return;
    try {
      const res = await fetch(`${BACKEND}/api/teams/invitations/${invite.membership_id}/reject`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao recusar convite.');
      
      setInvitations(prev => prev.filter(i => i.membership_id !== invite.membership_id));
    } catch (err) {
      alert(err.message);
    }
  };

  // Create new team
  const handleCreateTeam = async (e) => {
    e.preventDefault();
    if (!newTeamName.trim()) return;
    try {
      const res = await fetch(`${BACKEND}/api/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome: newTeamName })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar equipe.');
      }
      setTeams(prev => [...prev, data]);
      setNewTeamName('');
      setShowCreateTeamModal(false);
      selectTeam(data);
    } catch (err) {
      alert(err.message);
    }
  };

  // Select team and fetch or create its chat session
  const selectTeam = async (team) => {
    setActiveTeam(team);
    setActiveSession(null);
    setMessages([]);
    
    try {
      // Get all sessions
      const res = await fetch(`${BACKEND}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allSessions = await res.json();
      
      // Look for a session with matching team_id
      const teamSession = allSessions.find(s => s.team_id === team.id);
      if (teamSession) {
        setActiveSession(teamSession);
        // Load messages for this session
        const msgRes = await fetch(`${BACKEND}/api/chat/sessions/${teamSession.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const msgData = await msgRes.json();
        setMessages(msgData);
      } else {
        // Automatically create a shared session for this team
        const createRes = await fetch(`${BACKEND}/api/chat/sessions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            title: `Conversa Compartilhada - ${team.nome}`,
            teamId: team.id
          })
        });
        const newSession = await createRes.json();
        setActiveSession(newSession);
        setMessages([]);
      }
    } catch (err) {
      console.error('Error selecting team chat session:', err);
    }
  };

  // Send message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading || !activeSession || !activeTeam) return;

    const messageInput = input;
    const fileToUpload = selectedFile;
    setInput('');
    setSelectedFile(null);
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('sessionId', activeSession.id);
      formData.append('content', messageInput);
      formData.append('dlpLevel', localStorage.getItem('dlp_level') || 'rigoroso');
      formData.append('aiModel', localStorage.getItem('ai_model') || 'gpt-4o');
      formData.append('aiTemp', localStorage.getItem('ai_temp') || '0.7');
      if (fileToUpload) {
        formData.append('file', fileToUpload);
      }

      const res = await fetch(`${BACKEND}/api/chat/message`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || `Erro no servidor (${res.status})`);
      }
      
      // Team chat responds with 202 Accepted right away.
      // Message streaming events are fully handled by WebSockets room broadcast.
    } catch (err) {
      console.error('Failed to send team message:', err);
      alert('Erro ao enviar mensagem: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Edit assistant message collaboratively
  const handleEditMessage = async (messageId, newContent) => {
    try {
      const res = await fetch(`${BACKEND}/api/chat/messages/${messageId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ content: newContent })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao salvar edição.');
      }
      // UI updates automatically via WebSocket event 'message_edited' broadcasted to the room
    } catch (err) {
      alert(err.message);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(e);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('O arquivo deve ter no máximo 5MB.');
        return;
      }
      setSelectedFile(file);
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Seu navegador não suporta reconhecimento de voz.");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      console.error('Erro no reconhecimento de voz:', event.error);
      setIsListening(false);
    };

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(prev => prev ? prev + ' ' + transcript : transcript);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const hasSensitiveData = useMemo(() => {
    if (!input) return false;
    const dlp = localStorage.getItem('dlp_level') || 'rigoroso';
    if (dlp === 'desativado') return false;
    
    const cpfFormatted  = /\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/;
    const cpfRaw        = /\b\d{11}\b/;
    const cnpjFormatted = /\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/;
    const cnpjRaw       = /\b\d{14}\b/;
    return (
      cpfFormatted.test(input) ||
      cpfRaw.test(input)       ||
      cnpjFormatted.test(input)||
      cnpjRaw.test(input)
    );
  }, [input]);

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD';

  return (
    <div className="chat-page">
      {/* Sidebar: Invitations & Team selection */}
      <div className="chat-sidebar" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        
        {/* Teams Header */}
        <div className="chat-sidebar__header">
          <h2>Meus Espaços</h2>
          <button className="chat-new-btn" onClick={() => setShowCreateTeamModal(true)} title="Criar Nova Equipe">
            <Plus size={18} />
          </button>
        </div>

        {/* Teams List */}
        <div className="chat-sidebar__sessions" style={{ flex: 1, overflowY: 'auto', padding: '8px 10px' }}>
          {loadingTeams ? (
            <div className="chat-sidebar__loading">
              <Loader2 size={20} className="spin" />
            </div>
          ) : teams.length === 0 ? (
            <div className="chat-sidebar__empty" style={{ padding: '20px 10px' }}>
              <Users size={24} style={{ color: 'var(--text-muted)' }} />
              <p style={{ fontSize: '0.8rem', marginTop: '6px' }}>Nenhum espaço ativo</p>
            </div>
          ) : (
            teams.map(team => (
              <div
                key={team.id}
                className={`chat-session-item ${activeTeam?.id === team.id ? 'active' : ''}`}
                onClick={() => selectTeam(team)}
                style={{ padding: '12px 10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', overflow: 'hidden', flex: 1 }}>
                  <span className="chat-session-item__title" style={{ fontWeight: 600, fontSize: '0.875rem' }}>{team.nome}</span>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-secondary)' }}>
                    {team.papel === 'admin' ? 'Administrador' : 'Membro'}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Invitations Section */}
        {invitations.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border)', padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, backgroundColor: 'var(--bg-page)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Users size={14} style={{ color: 'var(--voll-red)' }} />
              <h3 style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Convites Pendentes ({invitations.length})</h3>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '160px', overflowY: 'auto' }}>
              {invitations.map(invite => (
                <div 
                  key={invite.membership_id}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-surface)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                    boxShadow: 'var(--shadow-xs)',
                    transition: 'transform 0.15s ease',
                  }}
                  className="invite-item-card"
                >
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{invite.team_name}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>Por: {invite.creator_name || 'Admin'}</span>
                  </div>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      onClick={() => handleAcceptInvite(invite)}
                      className="btn"
                      style={{
                        flex: 1,
                        padding: '3px 6px',
                        fontSize: '0.7rem',
                        justifyContent: 'center',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <CheckCircle2 size={12} style={{ marginRight: '4px' }} /> Aceitar
                    </button>
                    <button
                      onClick={() => handleRejectInvite(invite)}
                      className="btn btn-outline"
                      style={{
                        flex: 1,
                        padding: '3px 6px',
                        fontSize: '0.7rem',
                        justifyContent: 'center',
                        color: 'var(--voll-red)',
                        borderColor: 'rgba(220,38,38,0.2)',
                        transition: 'transform 0.1s ease'
                      }}
                      onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                      onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    >
                      <XCircle size={12} style={{ marginRight: '4px' }} /> Recusar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Chat Area */}
      <div className="chat-main">
        {activeTeam && activeSession ? (
          <>
            {/* Chat Header */}
            <div className="chat-main-header" style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 28px',
              borderBottom: '1px solid var(--border)',
              backgroundColor: 'var(--bg-surface)',
              flexShrink: 0
            }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {activeTeam.nome}
                  <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--voll-red-soft)', color: 'var(--voll-red)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Espaço Compartilhado
                  </span>
                </h2>
                
                {/* Active users avatar stack */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#10b981' }} />
                    Membros Online:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    {onlineMembers.map(m => (
                      <div 
                        key={m.id} 
                        style={{
                          width: '24px',
                          height: '24px',
                          borderRadius: '50%',
                          backgroundColor: 'var(--bg-subtle)',
                          color: 'var(--voll-red)',
                          fontSize: '0.7rem',
                          fontWeight: 700,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          border: '1.5px solid var(--bg-surface)',
                          overflow: 'hidden'
                        }}
                        title={`${m.name} (${m.email})`}
                      >
                        {m.avatar ? (
                          <img src={m.avatar} alt={m.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          m.name.slice(0, 2).toUpperCase()
                        )}
                      </div>
                    ))}
                    {onlineMembers.length === 0 && (
                      <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Carregando presenças...</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Admin configuration button */}
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                {userTeamRole === 'admin' && (
                  <button
                    className="btn btn-outline"
                    onClick={() => {
                      loadTeamMembers(activeTeam.id);
                      setShowManageModal(true);
                    }}
                    style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
                  >
                    <Settings size={14} />
                    <span>Gerenciar Equipe</span>
                  </button>
                )}
              </div>
            </div>

            {/* Chat Messages */}
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <ChatMessage key={msg.id || msg.created_at || `msg-${index}`} message={msg} onEdit={handleEditMessage} />
              ))}
              {loading && (
                <div className="chat-message chat-message--ai">
                  <div className="chat-message__avatar"><Bot size={16} /></div>
                  <div className="chat-message__body">
                    <div className="chat-message__header">
                      <span className="chat-message__sender">Voll AI</span>
                    </div>
                    <div className="chat-typing">
                      <Loader2 size={14} className="spin" />
                      <span>Voll AI está pensando…</span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input Area */}
            <div className="chat-input-area">
              {isListening && (
                <div className="chat-voice-active-banner">
                  <span className="voice-pulse-dot" />
                  <span>Ouvindo sua voz... Fale agora!</span>
                </div>
              )}
              {selectedFile && (
                <div className="chat-file-preview">
                  <span className="chat-file-name">📎 {selectedFile.name}</span>
                  <button className="chat-file-remove" onClick={() => setSelectedFile(null)} title="Remover anexo">
                    <X size={14} />
                  </button>
                </div>
              )}
              <form
                onSubmit={sendMessage}
                className={`chat-input-form${hasSensitiveData ? ' chat-input-form--warn' : ''}${isListening ? ' chat-input-form--recording' : ''}`}
              >
                <button 
                  type="button" 
                  className="chat-attach-btn" 
                  onClick={() => fileInputRef.current?.click()} 
                  title="Anexar arquivo (PDF, Imagem, Texto)"
                  disabled={loading}
                >
                  <Paperclip size={20} />
                </button>
                <button
                  type="button"
                  className={`chat-voice-btn${isListening ? ' chat-voice-btn--recording' : ''}`}
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Parar ditar" : "Ditar mensagem (Gravar voz)"}
                  disabled={loading}
                >
                  {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                </button>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  style={{ display: 'none' }} 
                  onChange={handleFileChange}
                  accept=".pdf,.txt,.csv,.json,.png,.jpg,.jpeg"
                />
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={isListening ? "Ouvindo sua voz... Fale agora!" : "Fale com o Voll AI neste chat compartilhado..."}
                  rows={1}
                  disabled={loading}
                  className="chat-input"
                  style={{ paddingLeft: '8px' }}
                />
                <button
                  type="submit"
                  className="chat-send-btn"
                  disabled={!input.trim() || loading}
                  title="Enviar"
                >
                  {loading ? <Loader2 size={20} className="spin" /> : <Send size={20} />}
                </button>
              </form>

              {hasSensitiveData ? (
                <p className="chat-input-warn-hint">
                  <ShieldAlert size={13} />
                  Nota: Lembre-se de não compartilhar dados pessoais de clientes.
                </p>
              ) : (
                <p className="chat-disclaimer">
                  As respostas da IA são sincronizadas em tempo real com todos os membros ativos deste espaço.
                </p>
              )}
            </div>
          </>
        ) : (
          <div className="chat-welcome">
            <div className="chat-welcome__icon">
              <Users size={48} />
            </div>
            <h1>Espaços de Equipe</h1>
            <p>Selecione um espaço na barra lateral ou crie uma equipe nova.<br />Membros convidados podem participar após aceitar o convite.</p>
          </div>
        )}
      </div>

      {/* MODAL: Criar Equipe */}
      {showCreateTeamModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="form-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
            <h3 style={{ marginBottom: '12px' }}>Criar Nova Equipe</h3>
            <form onSubmit={handleCreateTeam}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Nome da Equipe</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newTeamName} 
                  onChange={(e) => setNewTeamName(e.target.value)}
                  placeholder="Ex: Comercial SP, Time de Devs..."
                  required
                  autoFocus
                />
              </div>
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-outline" onClick={() => setShowCreateTeamModal(false)}>
                  Cancelar
                </button>
                <button type="submit" className="btn btn-primary">
                  Criar Equipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Gerenciar Equipe */}
      {showManageModal && activeTeam && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px'
        }}>
          <div className="form-card" style={{ width: '100%', maxWidth: '550px', maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Gerenciar Membros</h3>
              <button 
                type="button" 
                onClick={() => {
                  setShowManageModal(false);
                  setSearchEmail('');
                  setSearchedUser(null);
                  setSearchStatus(null);
                }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Adicionar Membro */}
            <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '16px', backgroundColor: 'var(--bg-page)', marginBottom: '20px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 600 }}>Convidar Membro por E-mail corporativo</h4>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="email"
                  className="form-control"
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  placeholder="colaborador@vollsolutions.com.br"
                  style={{ flex: 1 }}
                />
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={async () => {
                    if (!searchEmail.trim()) return;
                    setSearchStatus('searching');
                    setSearchedUser(null);
                    try {
                      const res = await fetch(`${BACKEND}/api/teams/users/search?email=${encodeURIComponent(searchEmail.trim())}`, {
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      if (!res.ok) {
                        setSearchStatus('not_found');
                        return;
                      }
                      const userObj = await res.json();
                      setSearchedUser(userObj);
                      setSearchStatus('success');
                    } catch (err) {
                      setSearchStatus('error');
                    }
                  }}
                  disabled={searchStatus === 'searching'}
                >
                  {searchStatus === 'searching' ? 'Buscando...' : 'Buscar'}
                </button>
              </div>

              {searchStatus === 'not_found' && (
                <p style={{ color: 'var(--voll-red)', fontSize: '0.8rem', marginTop: '8px', margin: '8px 0 0 0' }}>⚠️ Nenhum colaborador encontrado com este e-mail.</p>
              )}
              {searchStatus === 'success' && searchedUser && (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: '12px',
                  padding: '10px',
                  backgroundColor: 'var(--bg-surface)',
                  borderRadius: 'var(--radius-sm)',
                  border: '1px solid var(--border)'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      color: 'var(--voll-red)',
                      overflow: 'hidden'
                    }}>
                      {searchedUser.avatar ? (
                        <img src={searchedUser.avatar} alt={searchedUser.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        searchedUser.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600 }}>{searchedUser.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{searchedUser.email}</div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                    onClick={async () => {
                      try {
                        const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}/members`, {
                          method: 'POST',
                          headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                          },
                          body: JSON.stringify({ email: searchedUser.email })
                        });
                        const data = await res.json();
                        if (!res.ok) {
                          throw new Error(data.error || 'Erro ao adicionar membro.');
                        }
                        setTeamMembers(prev => [...prev, data]);
                        setSearchedUser(null);
                        setSearchEmail('');
                        setSearchStatus(null);
                        alert('Convite enviado com sucesso! O colaborador receberá um alerta para ingressar na equipe.');
                      } catch (err) {
                        alert(err.message);
                      }
                    }}
                  >
                    Convidar
                  </button>
                </div>
              )}
            </div>

            {/* Lista de Membros */}
            <h4 style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 600 }}>Membros da Equipe</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '300px', overflowY: 'auto', paddingRight: '4px' }}>
              {teamMembers.map(member => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg-surface)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 600,
                      color: 'var(--voll-red)',
                      overflow: 'hidden'
                    }}>
                      {member.avatar ? (
                        <img src={member.avatar} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        member.name.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{member.name} {member.id === user?.id ? '(Você)' : ''}</span>
                        {member.status === 'pendente' && (
                          <span style={{ fontSize: '0.62rem', backgroundColor: 'var(--bg-subtle)', color: 'var(--text-secondary)', padding: '1px 6px', borderRadius: '4px' }}>
                            Pendente
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{member.email}</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {member.id === user?.id ? (
                      <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        {member.papel === 'admin' ? 'Administrador' : 'Membro'}
                      </span>
                    ) : (
                      <>
                        <select
                          value={member.papel}
                          className="form-control"
                          style={{ padding: '4px 8px', fontSize: '0.75rem', width: 'auto', height: 'auto' }}
                          onChange={async (e) => {
                            const newRole = e.target.value;
                            try {
                              const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}/members/${member.id}`, {
                                method: 'PATCH',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'Authorization': `Bearer ${token}`
                                },
                                body: JSON.stringify({ papel: newRole })
                              });
                              if (!res.ok) {
                                const data = await res.json();
                                throw new Error(data.error || 'Erro ao alterar papel.');
                              }
                              setTeamMembers(prev => prev.map(m => m.id === member.id ? { ...m, papel: newRole } : m));
                            } catch (err) {
                              alert(err.message);
                            }
                          }}
                        >
                          <option value="membro">Membro</option>
                          <option value="admin">Administrador</option>
                        </select>

                        <button
                          type="button"
                          className="btn btn-outline"
                          style={{ padding: '6px', color: 'var(--voll-red)', borderColor: 'rgba(220,38,38,0.2)' }}
                          title="Remover Membro"
                          onClick={async () => {
                            if (!window.confirm(`Tem certeza de que deseja remover ${member.name} da equipe?`)) return;
                            try {
                              const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}/members/${member.id}`, {
                                method: 'DELETE',
                                headers: { Authorization: `Bearer ${token}` }
                              });
                              if (!res.ok) {
                                const data = await res.json();
                                throw new Error(data.error || 'Erro ao remover membro.');
                              }
                              setTeamMembers(prev => prev.filter(m => m.id !== member.id));
                            } catch (err) {
                              alert(err.message);
                            }
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ color: 'var(--voll-red)', borderColor: 'rgba(220, 38, 38, 0.2)' }}
                onClick={async () => {
                  if (!window.confirm('Tem certeza de que deseja EXCLUIR permanentemente esta equipe e todas as conversas compartilhadas dela?')) return;
                  try {
                    const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}`, {
                      method: 'DELETE',
                      headers: { Authorization: `Bearer ${token}` }
                    });
                    if (!res.ok) {
                      const data = await res.json();
                      throw new Error(data.error || 'Erro ao excluir equipe.');
                    }
                    setTeams(prev => prev.filter(t => t.id !== activeTeam.id));
                    setActiveTeam(null);
                    setActiveSession(null);
                    setMessages([]);
                    setShowManageModal(false);
                    alert('Equipe excluída com sucesso.');
                  } catch (err) {
                    alert(err.message);
                  }
                }}
              >
                Excluir Equipe
              </button>
              <button 
                type="button" 
                className="btn btn-primary" 
                onClick={() => {
                  setShowManageModal(false);
                  setSearchEmail('');
                  setSearchedUser(null);
                  setSearchStatus(null);
                }}
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeamChat;
