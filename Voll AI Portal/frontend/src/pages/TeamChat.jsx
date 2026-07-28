import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Plus, Trash2, MessageSquarePlus, Send, Loader2, Bot, Edit2, Check, X, ShieldAlert, Paperclip, Mic, MicOff, Share2, Users, Settings, User, CheckCircle2, XCircle, PanelLeftClose, PanelLeftOpen, Cpu, Code, Database, Shield, BarChart2, Globe, Zap, Briefcase, LogOut } from 'lucide-react';
import ChatMessage from '../components/ChatMessage';
import TypingIndicator from '../components/TypingIndicator';
import { useToast } from '../contexts/ToastContext';
import { Maximize2, Minimize2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { io } from 'socket.io-client';
import TechBackground from '../components/TechBackground';
import styles from './TeamChat.module.css';

const PRESET_ICONS = [
  { name: 'Cpu', label: 'Tecnologia' },
  { name: 'Code', label: 'Desenvolvimento' },
  { name: 'Database', label: 'Dados' },
  { name: 'Shield', label: 'Segurança' },
  { name: 'BarChart2', label: 'Comercial' },
  { name: 'Globe', label: 'Global' },
  { name: 'Zap', label: 'Inovação' },
  { name: 'Briefcase', label: 'Projetos' }
];

const getPresetIcon = (name) => {
  switch (name) {
    case 'Cpu': return Cpu;
    case 'Code': return Code;
    case 'Database': return Database;
    case 'Shield': return Shield;
    case 'BarChart2': return BarChart2;
    case 'Globe': return Globe;
    case 'Zap': return Zap;
    case 'Briefcase': return Briefcase;
    default: return Users;
  }
};

const renderTeamIcon = (team) => {
  if (team.avatar && team.avatar.startsWith('data:image')) {
    return <img src={team.avatar} alt={team.nome} style={{ width: '100%', height: '100%', borderRadius: 'inherit', objectFit: 'cover' }} />;
  }
  if (team.avatar && team.avatar.startsWith('preset:')) {
    const iconName = team.avatar.split(':')[1];
    const IconComponent = getPresetIcon(iconName);
    return <IconComponent size={20} />;
  }
  return team.nome.slice(0, 2).toUpperCase();
};

const renderInvitationIcon = (invite) => {
  if (invite.team_avatar && invite.team_avatar.startsWith('data:image')) {
    return <img src={invite.team_avatar} alt={invite.team_name} style={{ width: '20px', height: '20px', borderRadius: '4px', objectFit: 'cover' }} />;
  }
  if (invite.team_avatar && invite.team_avatar.startsWith('preset:')) {
    const iconName = invite.team_avatar.split(':')[1];
    const IconComponent = getPresetIcon(iconName);
    return <IconComponent size={14} style={{ color: 'var(--voll-red)' }} />;
  }
  return <Users size={14} style={{ color: 'var(--text-muted)' }} />;
};

const BACKEND = 'http://localhost:3001';

const TeamChat = () => {
  const { user, token } = useAuth();
  const [isDark, setIsDark] = useState(() => document.documentElement.getAttribute('data-theme') === 'dark');

  // Sincroniza com as mudanças de tema
  useEffect(() => {
    const observer = new MutationObserver(() => {
      setIsDark(document.documentElement.getAttribute('data-theme') === 'dark');
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

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

  const [editingId, setEditingId] = useState(null);
  const [editTitle, setEditTitle] = useState('');

  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false);

  // Estados de Socket e Presença
  const [socket, setSocket] = useState(null);
  const [onlineMembers, setOnlineMembers] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [userTeamRole, setUserTeamRole] = useState('membro');

  // Estados dos Modais
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false);
  const [newTeamName, setNewTeamName] = useState('');
  const [newTeamAvatar, setNewTeamAvatar] = useState('');
  const [showManageModal, setShowManageModal] = useState(false);
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [manageModalTab, setManageModalTab] = useState('members');
  const [editTeamName, setEditTeamName] = useState('');
  const [editTeamAvatar, setEditTeamAvatar] = useState('');
  const teamAvatarInputRef = useRef(null);
  const editTeamAvatarInputRef = useRef(null);

  // Estados de Busca de Membros
  const [searchEmail, setSearchEmail] = useState('');
  const [searchedUser, setSearchedUser] = useState(null);
  const [searchStatus, setSearchStatus] = useState(null);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Conecta ao Socket.io na montagem
  useEffect(() => {
    const newSocket = io(BACKEND, {
      transports: ['websocket', 'polling']
    });
    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Busca equipes iniciais e convites pendentes
  useEffect(() => {
    if (token) {
      loadTeams();
      loadInvitations();
    }
  }, [token]);

  // Gerencia entrada na sala e listeners do WebSocket
  useEffect(() => {
    if (!socket || !activeTeam || !user) return;

    // Entra na sala de socket da equipe
    socket.emit('join_team', {
      teamId: activeTeam.id,
      user: {
        id: user.id,
        name: user.name,
        avatar: user.avatar,
        email: user.email
      }
    });

    // Carrega lista de membros e papel
    loadTeamMembers(activeTeam.id);

    // Escuta atualizações de presença
    socket.on('team_online_members', (members) => {
      setOnlineMembers(members);
    });

    // Escuta novas mensagens adicionadas (usuário ou placeholders do assistente)
    socket.on('message_added', (msg) => {
      setMessages(prev => {
        if (prev.some(m => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });

    // Escuta chunks de streaming de mensagem
    socket.on('message_chunk', ({ messageId, chunk }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content: m.content + chunk }
            : m
        )
      );
    });

    // Escuta mensagem de streaming completa
    socket.on('message_complete', ({ messageId, content }) => {
      setMessages(prev =>
        prev.map(m =>
          m.id === messageId
            ? { ...m, content }
            : m
        )
      );
    });

    // Escuta mensagens editadas
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

  // Rola para o final quando as mensagens mudam
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Carrega convites
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

  // Carrega equipes aceitas
  const loadTeams = async () => {
    setLoadingTeams(true);
    try {
      const res = await fetch(`${BACKEND}/api/teams`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setTeams(data);
        // Seleciona automaticamente a primeira equipe se disponível
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

  // Carrega membros da equipe e papel do usuário
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

  // Lida com aceitação de convite
  const handleAcceptInvite = async (invite) => {
    try {
      const res = await fetch(`${BACKEND}/api/teams/invitations/${invite.membership_id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao aceitar convite.');
      
      // Remove convite e recarrega equipes
      setInvitations(prev => prev.filter(i => i.membership_id !== invite.membership_id));
      await loadTeams();
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Lida com rejeição de convite
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
      toast.error(err.message);
    }
  };

  // Cria nova equipe
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
        body: JSON.stringify({ nome: newTeamName, avatar: newTeamAvatar })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao criar equipe.');
      }
      setTeams(prev => [...prev, data]);
      setNewTeamName('');
      setNewTeamAvatar('');
      setShowCreateTeamModal(false);
      selectTeam(data);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleCreateTeamAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewTeamAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleEditTeamAvatarUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('A imagem deve ter no máximo 2MB.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setEditTeamAvatar(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleLeaveTeam = () => {
    setShowLeaveModal(true);
  };

  const confirmLeaveTeam = async () => {
    if (!activeTeam) return;
    setLoading(true);
    
    try {
      const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}/members/${user.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Falha ao sair da equipe.');
      }
      setTeams(prev => prev.filter(t => t.id !== activeTeam.id));
      setActiveTeam(null);
      setMessages([]);
      setSessions([]);
      setActiveSession(null);
      setShowLeaveModal(false);
      if (socket) {
        socket.emit('leave_team', activeTeam.id);
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenManageModal = () => {
    if (!activeTeam) return;
    setEditTeamName(activeTeam.nome);
    setEditTeamAvatar(activeTeam.avatar || '');
    setManageModalTab('members');
    loadTeamMembers(activeTeam.id);
    setShowManageModal(true);
  };

  const handleUpdateTeamSettings = async (e) => {
    e.preventDefault();
    if (!editTeamName.trim() || !activeTeam) return;
    try {
      const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ nome: editTeamName.trim(), avatar: editTeamAvatar })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao atualizar configurações da equipe.');
      }
      
      // Atualiza estado local
      setTeams(prev => prev.map(t => t.id === activeTeam.id ? { ...t, nome: data.nome, avatar: data.avatar } : t));
      setActiveTeam(prev => ({ ...prev, nome: data.nome, avatar: data.avatar }));
      toast.error('Configurações atualizadas com sucesso!');
    } catch (err) {
      toast.error(err.message);
    }
  };

  const handleDeleteTeam = async () => {
    if (!activeTeam) return;
    if (!window.confirm(`ATENÇÃO: Tem certeza de que deseja excluir permanentemente a equipe "${activeTeam.nome}" e todas as suas conversas compartilhadas? Esta ação não pode ser desfeita.`)) return;
    
    try {
      const res = await fetch(`${BACKEND}/api/teams/${activeTeam.id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Erro ao excluir equipe.');
      }
      
      toast.error('Equipe excluída com sucesso!');
      setShowManageModal(false);
      
      // Remove equipe da lista e reseta seleção
      const remainingTeams = teams.filter(t => t.id !== activeTeam.id);
      setTeams(remainingTeams);
      if (remainingTeams.length > 0) {
        selectTeam(remainingTeams[0]);
      } else {
        setActiveTeam(null);
        setActiveSession(null);
        setMessages([]);
      }
    } catch (err) {
      toast.error(err.message);
    }
  };

  // Carrega todas as sessões (equipe + privada) para sincronizar estado
  const loadSessions = async () => {
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) {
        setSessions(data);
      }
    } catch (err) {
      console.error('Failed to load sessions:', err);
    }
  };

  // Seleciona uma sessão específica (conversa)
  const selectSession = async (session) => {
    setActiveSession(session);
    setMessages([]);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions/${session.id}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      setMessages(data);
    } catch (err) {
      console.error('Failed to load messages:', err);
    }
  };

  // Seleciona equipe e busca suas sessões de chat
  const selectTeam = async (team) => {
    setActiveTeam(team);
    setActiveSession(null);
    setMessages([]);
    
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const allSessions = await res.json();
      setSessions(allSessions);
      
      // Procura por quaisquer sessões com o mesmo team_id
      const teamSessions = allSessions.filter(s => s.team_id === team.id);
      if (teamSessions.length > 0) {
        // Seleciona a primeira (mais recente)
        selectSession(teamSessions[0]);
      } else {
        // Cria automaticamente uma sessão compartilhada padrão para esta equipe
        createNewTeamSession(team.id, `Geral - ${team.nome}`);
      }
    } catch (err) {
      console.error('Error selecting team chat session:', err);
    }
  };

  // Cria uma nova sessão para uma equipe específica
  const createNewTeamSession = async (teamId, title = 'Nova conversa') => {
    setLoading(true);
    try {
      const res = await fetch(`${BACKEND}/api/chat/sessions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          title,
          teamId
        })
      });
      if (!res.ok) throw new Error('Falha ao iniciar conversa.');
      const newSession = await res.json();
      setSessions(prev => [newSession, ...prev]);
      selectSession(newSession);
      setTimeout(() => inputRef.current?.focus(), 100);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao iniciar conversa de equipe.');
    } finally {
      setLoading(false);
    }
  };

  // Exclui uma sessão
  const deleteSession = async (e, sessionId) => {
    e.stopPropagation();
    if (!window.confirm('Excluir esta conversa compartilhada?')) return;
    try {
      await fetch(`${BACKEND}/api/chat/sessions/${sessionId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (activeSession?.id === sessionId) {
        const remaining = sessions.filter(s => s.team_id === activeTeam?.id && s.id !== sessionId);
        if (remaining.length > 0) {
          selectSession(remaining[0]);
        } else {
          setActiveSession(null);
          setMessages([]);
        }
      }
    } catch (err) {
      console.error('Failed to delete session:', err);
    }
  };

  const startRename = (e, session) => {
    e.stopPropagation();
    setEditingId(session.id);
    setEditTitle(session.title);
  };

  const saveRename = async (sessionId) => {
    if (!editTitle.trim()) return;
    try {
      await fetch(`${BACKEND}/api/chat/sessions/${sessionId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title: editTitle }),
      });
      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, title: editTitle } : s));
      if (activeSession?.id === sessionId) setActiveSession(prev => ({ ...prev, title: editTitle }));
    } catch (err) {
      console.error('Failed to rename session:', err);
    }
    setEditingId(null);
  };

  // Envia mensagem
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

      // Renomeia a sessão automaticamente
      if (activeSession.title === 'Nova conversa') {
        const autoTitle = messageInput.slice(0, 50);
        await fetch(`${BACKEND}/api/chat/sessions/${activeSession.id}`, {
          method: 'PATCH',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ title: autoTitle }),
        });
        setSessions(prev => prev.map(s => s.id === activeSession.id ? { ...s, title: autoTitle } : s));
        setActiveSession(prev => ({ ...prev, title: autoTitle }));
      }
    } catch (err) {
      console.error('Failed to send team message:', err);
      toast.error('Erro ao enviar mensagem: ' + err.message);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // Edita mensagem do assistente de forma colaborativa
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
      // UI atualiza automaticamente via evento de WebSocket 'message_edited' transmitido para a sala
    } catch (err) {
      toast.error(err.message);
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
        toast.error('O arquivo deve ter no máximo 5MB.');
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
      toast.error("Seu navegador não suporta reconhecimento de voz.");
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

  const activeTeamSessions = useMemo(() => {
    if (!activeTeam) return [];
    return sessions.filter(s => s.team_id === activeTeam.id);
  }, [sessions, activeTeam]);

  const initials = user?.name ? user.name.slice(0, 2).toUpperCase() : 'AD';

  return (
    <div className={`chat-page ${styles.teamChatPage}`}>
      {/* Sidebar em nível de página: Coluna 1 (workspaces) + Coluna 2 (canais) */}
      <div 
        className="chat-sidebar" 
        style={{ 
          display: 'flex', 
          flexDirection: 'row', 
          height: '100%', 
          width: isChatSidebarCollapsed ? '0px' : '320px',
          minWidth: isChatSidebarCollapsed ? '0px' : '320px',
          transition: 'width 0.25s cubic-bezier(0.16, 1, 0.3, 1), min-width 0.25s cubic-bezier(0.16, 1, 0.3, 1)',
          overflow: 'hidden',
          borderRight: isChatSidebarCollapsed ? 'none' : '1px solid var(--border)'
        }}
      >
        <div style={{ width: '320px', display: 'flex', flexDirection: 'row', height: '100%', flexShrink: 0 }}>
          {/* Coluna 1: Seletor de Workspace/Equipe (largura 72px) */}
        <div 
          style={{
            width: '72px',
            minWidth: '72px',
            backgroundColor: 'var(--bg-page)',
            borderRight: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            padding: '12px 0',
            overflowY: 'auto',
            flexShrink: 0
          }}
          className="team-chat-spaces-column"
        >
          {/* Lista de Equipes */}
          {loadingTeams ? (
            <Loader2 size={16} className="spin" style={{ color: 'var(--text-muted)', margin: '12px 0' }} />
          ) : (
            teams.map(team => (
              <div key={team.id} style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%', marginBottom: '12px', flexShrink: 0 }}>
                {/* Barra indicadora de ativo */}
                {activeTeam?.id === team.id && (
                  <div style={{
                    position: 'absolute',
                    left: 0,
                    top: '10px',
                    width: '4px',
                    height: '24px',
                    backgroundColor: 'var(--voll-red)',
                    borderTopRightRadius: '4px',
                    borderBottomRightRadius: '4px'
                  }} />
                )}
                <button
                  onClick={() => selectTeam(team)}
                  title={team.nome}
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: activeTeam?.id === team.id ? '12px' : '50%',
                    backgroundColor: activeTeam?.id === team.id ? 'var(--voll-red)' : 'var(--bg-subtle)',
                    color: activeTeam?.id === team.id ? 'white' : 'var(--text-primary)',
                    fontWeight: 700,
                    fontSize: '0.9rem',
                    border: 'none',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
                    boxShadow: activeTeam?.id === team.id ? 'var(--shadow-sm)' : 'none'
                  }}
                  onMouseEnter={(e) => {
                    if (activeTeam?.id !== team.id) {
                      e.currentTarget.style.borderRadius = '12px';
                      e.currentTarget.style.backgroundColor = 'var(--voll-red-soft)';
                      e.currentTarget.style.color = 'var(--voll-red)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (activeTeam?.id !== team.id) {
                      e.currentTarget.style.borderRadius = '50%';
                      e.currentTarget.style.backgroundColor = 'var(--bg-subtle)';
                      e.currentTarget.style.color = 'var(--text-primary)';
                    }
                  }}
                >
                  {renderTeamIcon(team)}
                </button>
              </div>
            ))
          )}
          
          {/* Botão de criar nova equipe */}
          <button
            onClick={() => setShowCreateTeamModal(true)}
            title="Criar Novo Espaço de Equipe"
            style={{
              width: '44px',
              height: '44px',
              borderRadius: '50%',
              backgroundColor: 'var(--bg-surface)',
              border: '1.5px dashed var(--border)',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              marginTop: '8px',
              flexShrink: 0
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderRadius = '12px';
              e.currentTarget.style.borderColor = 'var(--voll-red)';
              e.currentTarget.style.color = 'var(--voll-red)';
              e.currentTarget.style.backgroundColor = 'var(--voll-red-soft)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderRadius = '50%';
              e.currentTarget.style.borderColor = 'var(--border)';
              e.currentTarget.style.color = 'var(--text-secondary)';
              e.currentTarget.style.backgroundColor = 'var(--bg-surface)';
            }}
          >
            <Plus size={18} />
          </button>
        </div>

        {/* Coluna 2: Seletor de Conversas/Canais (largura 248px) */}
        <div 
          style={{
            width: '248px',
            minWidth: '248px',
            backgroundColor: 'var(--bg-surface)',
            display: 'flex',
            flexDirection: 'column',
            height: '100%',
            overflow: 'hidden',
            flexShrink: 0
          }}
          className="team-chat-conversations-column"
        >
          {activeTeam ? (
            <>
              {/* Info do Cabeçalho */}
              <div style={{
                padding: '16px 14px 12px',
                borderBottom: '1px solid var(--border)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '8px',
                flexShrink: 0
              }}>
                <h3 style={{
                  fontSize: '0.825rem',
                  fontWeight: 700,
                  color: 'var(--text-primary)',
                  margin: 0,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={activeTeam.nome}>
                  {activeTeam.nome}
                </h3>
                {userTeamRole === 'admin' ? (
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={handleOpenManageModal}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Gerenciar Equipe"
                    >
                      <Settings size={14} />
                    </button>
                    <button
                      onClick={handleLeaveTeam}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px', display: 'flex', alignItems: 'center' }}
                      title="Sair da Equipe"
                    >
                      <LogOut size={14} />
                    </button>
                  </div>
                ) : null}
              </div>

              {/* Lista de Conversas */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 14px 6px 14px',
                flexShrink: 0
              }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Conversas</span>
                <button
                  onClick={() => createNewTeamSession(activeTeam.id)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', padding: '2px' }}
                  title="Nova Conversa"
                >
                  <Plus size={14} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '4px 8px' }}>
                {activeTeamSessions.length === 0 ? (
                  <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', padding: '12px', fontStyle: 'italic' }}>Nenhuma conversa</span>
                ) : (
                  activeTeamSessions.map(session => (
                    <div
                      key={session.id}
                      className={`chat-session-item ${activeSession?.id === session.id ? 'active' : ''}`}
                      onClick={() => selectSession(session)}
                    >
                      {editingId === session.id ? (
                        <div className="chat-session-edit" onClick={e => e.stopPropagation()}>
                          <input
                            value={editTitle}
                            onChange={e => setEditTitle(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && saveRename(session.id)}
                            autoFocus
                            style={{ fontSize: '0.8rem', padding: '2px 4px' }}
                          />
                          <button onClick={() => saveRename(session.id)} style={{ padding: '2px' }}><Check size={12} /></button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '2px' }}><X size={12} /></button>
                        </div>
                      ) : (
                        <>
                          <span className="chat-session-item__title" style={{ fontSize: '0.8rem' }}># {session.title}</span>
                          <div className="chat-session-item__actions">
                            <button onClick={e => startRename(e, session)} title="Renomear">
                              <Edit2 size={12} />
                            </button>
                            <button onClick={e => deleteSession(e, session.id)} title="Excluir">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div style={{ padding: '20px 14px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '0.8rem', fontStyle: 'italic' }}>
              Selecione um espaço
            </div>
          )}

          {/* Seção de Convites na parte inferior da Coluna 2 */}
          {invitations.length > 0 && (
            <div style={{ borderTop: '1px solid var(--border)', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, backgroundColor: 'var(--bg-page)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Users size={12} style={{ color: 'var(--voll-red)' }} />
                <h3 style={{ fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--text-secondary)', margin: 0 }}>Convites ({invitations.length})</h3>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '120px', overflowY: 'auto' }}>
                {invitations.map(invite => (
                  <div 
                    key={invite.membership_id}
                    style={{
                      padding: '6px 8px',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: 'var(--bg-surface)',
                      border: '1px solid var(--border)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {renderInvitationIcon(invite)}
                      <span style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{invite.team_name}</span>
                    </div>
                    <span style={{ fontSize: '0.62rem', color: 'var(--text-secondary)' }}>Por: {invite.creator_name || 'Admin'}</span>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button
                        onClick={() => handleAcceptInvite(invite)}
                        className="btn"
                        style={{
                          flex: 1,
                          padding: '2px',
                          fontSize: '0.65rem',
                          justifyContent: 'center',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                        }}
                      >
                        Aceitar
                      </button>
                      <button
                        onClick={() => handleRejectInvite(invite)}
                        className="btn btn-outline"
                        style={{
                          flex: 1,
                          padding: '2px',
                          fontSize: '0.65rem',
                          justifyContent: 'center',
                          color: 'var(--voll-red)',
                          borderColor: 'rgba(220,38,38,0.2)',
                        }}
                      >
                        Recusar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Área Principal do Chat */}
      <div className={`chat-main ${styles.chatArea}`}>
        {/* Canvas de Background Tecnológico */}
        <TechBackground isDark={isDark} />

        {/* Cabeçalho Distinto de Equipe */}
        <div className={styles.topBanner}>
          <div className={styles.topBannerIcon}>
            <Users size={20} />
          </div>
          <div className={styles.topBannerText}>
            <strong>Espaço Colaborativo</strong>
            <span>Você está no ambiente de equipes. Comunique-se, crie e compartilhe com seus colegas.</span>
          </div>
        </div>

        {/* Cabeçalho do Chat */}
        <div className="chat-main-header" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '14px 28px',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'transparent',
          flexShrink: 0,
          position: 'relative',
          zIndex: 2
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              onClick={() => setIsChatSidebarCollapsed(prev => !prev)}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'var(--text-secondary)',
                display: 'flex',
                alignItems: 'center',
                padding: '6px',
                borderRadius: 'var(--radius-sm)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-subtle)'}
              onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
              title={isChatSidebarCollapsed ? "Mostrar menu do espaço" : "Esconder menu do espaço"}
              type="button"
            >
              {isChatSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
            </button>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                {activeTeam && activeSession ? activeSession.title : 'Espaços de Equipe'}
                {activeTeam && (
                  <span style={{ fontSize: '0.7rem', backgroundColor: 'var(--voll-red-soft)', color: 'var(--voll-red)', padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                    Espaço: {activeTeam.nome}
                  </span>
                )}
              </h2>
            
              {activeTeam && (
                /* Active users avatar stack */
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
              )}
            </div>
          </div>

          {/* Ações da equipe */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {activeTeam && userTeamRole === 'admin' && (
              <button
                className="btn btn-outline"
                onClick={handleOpenManageModal}
                style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px' }}
              >
                <Settings size={14} />
                <span>Gerenciar Equipe</span>
              </button>
            )}
            {activeTeam && userTeamRole === 'admin' && (
              <button
                className="btn btn-outline"
                onClick={handleLeaveTeam}
                style={{ gap: '6px', fontSize: '0.8rem', padding: '6px 12px', color: 'var(--text-secondary)' }}
                title="Sair da Equipe"
              >
                <LogOut size={14} />
                <span>Sair da Equipe</span>
              </button>
            )}
          </div>
        </div>

        {activeTeam && activeSession ? (
          <>
            {/* Mensagens do Chat */}
            {messages.length === 0 ? (
              <div className="chat-welcome" style={{ position: 'relative', zIndex: 1 }}>
                <div className="chat-welcome__icon">
                  <Bot size={48} />
                </div>
                <h1>Olá, sou o Voll AI</h1>
                <p>Assistente corporativo para a equipe <strong>{activeTeam.nome}</strong>.<br />Como posso ajudar o time hoje?</p>
              </div>
            ) : (
              <div className="chat-messages" style={{ position: 'relative', zIndex: 1 }}>
                {messages.map((msg, index) => (
                  <ChatMessage key={msg.id || msg.created_at || `msg-${index}`} message={msg} onEdit={handleEditMessage} isOnline={onlineMembers.includes(msg.sender_id)} />
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
            )}

            {/* Área de Entrada de Mensagem */}
            <div className="chat-input-area" style={{ position: 'relative', zIndex: 2 }}>
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
          <div className="chat-welcome" style={{ position: 'relative', zIndex: 1 }}>
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
                <label style={{ fontWeight: 600, fontSize: '0.85rem' }}>Nome da Equipe</label>
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

              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>Ícone da Equipe</label>
                
                {/* Botão de Preview e Upload */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                  <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    backgroundColor: 'var(--bg-subtle)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--voll-red)',
                    fontWeight: 700,
                    overflow: 'hidden',
                    border: '1.5px solid var(--border)',
                    flexShrink: 0
                  }}>
                    {newTeamAvatar ? (
                      newTeamAvatar.startsWith('data:image') ? (
                        <img src={newTeamAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        React.createElement(getPresetIcon(newTeamAvatar.split(':')[1]), { size: 22 })
                      )
                    ) : (
                      <Users size={22} style={{ color: 'var(--text-muted)' }} />
                    )}
                  </div>
                  
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                    onClick={() => teamAvatarInputRef.current?.click()}
                  >
                    Carregar Imagem
                  </button>
                  <input
                    type="file"
                    ref={teamAvatarInputRef}
                    onChange={handleCreateTeamAvatarUpload}
                    accept="image/*"
                    style={{ display: 'none' }}
                  />
                  
                  {newTeamAvatar && (
                    <button
                      type="button"
                      className="btn btn-ghost"
                      style={{ fontSize: '0.72rem', color: 'var(--voll-red)', padding: '4px' }}
                      onClick={() => setNewTeamAvatar('')}
                    >
                      Remover
                    </button>
                  )}
                </div>

                {/* Grade de Presets */}
                <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ou escolha um preset:</span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {PRESET_ICONS.map(preset => {
                    const PresetComp = getPresetIcon(preset.name);
                    const isSelected = newTeamAvatar === `preset:${preset.name}`;
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setNewTeamAvatar(`preset:${preset.name}`)}
                        title={preset.label}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid var(--voll-red)' : '1px solid var(--border)',
                          backgroundColor: isSelected ? 'var(--voll-red-soft)' : 'var(--bg-surface)',
                          color: isSelected ? 'var(--voll-red)' : 'var(--text-secondary)',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <PresetComp size={16} />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '20px' }}>
                <button type="button" className="btn btn-outline" onClick={() => { setShowCreateTeamModal(false); setNewTeamAvatar(''); setNewTeamName(''); }}>
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
              <h3 style={{ margin: 0 }}>Gerenciar Equipe: {activeTeam.nome}</h3>
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

            {/* Abas de Controle */}
            <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: '20px', gap: '16px' }}>
              <button
                type="button"
                className="btn-tab"
                onClick={() => setManageModalTab('members')}
                style={{
                  padding: '8px 4px 12px',
                  background: 'none',
                  border: 'none',
                  borderBottom: manageModalTab === 'members' ? '2px solid var(--voll-red)' : '2px solid transparent',
                  color: manageModalTab === 'members' ? 'var(--voll-red)' : 'var(--text-secondary)',
                  fontWeight: 600,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                Membros
              </button>
              
              {userTeamRole === 'admin' && (
                <button
                  type="button"
                  className="btn-tab"
                  onClick={() => setManageModalTab('settings')}
                  style={{
                    padding: '8px 4px 12px',
                    background: 'none',
                    border: 'none',
                    borderBottom: manageModalTab === 'settings' ? '2px solid var(--voll-red)' : '2px solid transparent',
                    color: manageModalTab === 'settings' ? 'var(--voll-red)' : 'var(--text-secondary)',
                    fontWeight: 600,
                    fontSize: '0.875rem',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                >
                  Configurações
                </button>
              )}
            </div>

            {/* TAB: Membros */}
            {manageModalTab === 'members' && (
              <>
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
                            toast.error('Convite enviado com sucesso! O colaborador receberá um alerta para ingressar na equipe.');
                          } catch (err) {
                            toast.error(err.message);
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
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto', paddingRight: '4px', marginBottom: '20px' }}>
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
                          overflow: 'hidden',
                          flexShrink: 0
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
                                  toast.error(err.message);
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
                                  toast.error(err.message);
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

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
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
              </>
            )}

            {/* TAB: Configurações */}
            {manageModalTab === 'settings' && userTeamRole === 'admin' && (
              <form onSubmit={handleUpdateTeamSettings} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.85rem', display: 'block', marginBottom: '6px' }}>Nome da Equipe</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editTeamName}
                    onChange={(e) => setEditTeamName(e.target.value)}
                    required
                  />
                </div>
                
                <div style={{ marginBottom: '8px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.85rem', fontWeight: 600 }}>Ícone da Equipe</label>
                  
                  {/* Botão de Preview e Upload */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      backgroundColor: 'var(--bg-subtle)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: 'var(--voll-red)',
                      fontWeight: 700,
                      overflow: 'hidden',
                      border: '1.5px solid var(--border)',
                      flexShrink: 0
                    }}>
                      {editTeamAvatar ? (
                        editTeamAvatar.startsWith('data:image') ? (
                          <img src={editTeamAvatar} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        ) : (
                          React.createElement(getPresetIcon(editTeamAvatar.split(':')[1]), { size: 22 })
                        )
                      ) : (
                        <Users size={22} style={{ color: 'var(--text-muted)' }} />
                      )}
                    </div>
                    
                    <button
                      type="button"
                      className="btn btn-outline"
                      style={{ fontSize: '0.75rem', padding: '6px 12px' }}
                      onClick={() => editTeamAvatarInputRef.current?.click()}
                    >
                      Alterar Imagem
                    </button>
                    <input
                      type="file"
                      ref={editTeamAvatarInputRef}
                      onChange={handleEditTeamAvatarUpload}
                      accept="image/*"
                      style={{ display: 'none' }}
                    />
                    
                    {editTeamAvatar && (
                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{ fontSize: '0.72rem', color: 'var(--voll-red)', padding: '4px' }}
                        onClick={() => setEditTeamAvatar('')}
                      >
                        Remover
                      </button>
                    )}
                  </div>

                  {/* Grade de Presets */}
                  <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>Ou selecione um preset:</span>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {PRESET_ICONS.map(preset => {
                      const PresetComp = getPresetIcon(preset.name);
                      const isSelected = editTeamAvatar === `preset:${preset.name}`;
                      return (
                        <button
                          key={preset.name}
                          type="button"
                          onClick={() => setEditTeamAvatar(`preset:${preset.name}`)}
                          title={preset.label}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: isSelected ? '2px solid var(--voll-red)' : '1px solid var(--border)',
                            backgroundColor: isSelected ? 'var(--voll-red-soft)' : 'var(--bg-surface)',
                            color: isSelected ? 'var(--voll-red)' : 'var(--text-secondary)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <PresetComp size={16} />
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', borderTop: '1px solid var(--border)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-outline"
                    style={{ color: 'var(--voll-red)', borderColor: 'rgba(224, 8, 46, 0.2)' }}
                    onClick={handleDeleteTeam}
                  >
                    Excluir Equipe
                  </button>
                  
                  <button type="submit" className="btn btn-primary">
                    Salvar Alterações
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
      {/* MODAL: Sair da Equipe */}
      {showLeaveModal && activeTeam && (
        <div style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '16px',
          backdropFilter: 'blur(4px)'
        }}>
          <div className="form-card" style={{ width: '100%', maxWidth: '400px', backgroundColor: 'var(--bg-surface)', padding: '24px', borderRadius: 'var(--radius-lg)', boxShadow: 'var(--shadow-md)', textAlign: 'center' }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '16px' }}>
              <div style={{ backgroundColor: 'var(--voll-red-soft)', padding: '16px', borderRadius: '50%' }}>
                <LogOut size={32} style={{ color: 'var(--voll-red)' }} />
              </div>
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '8px' }}>Sair da Equipe</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '24px', lineHeight: '1.5' }}>
              Tem certeza que deseja sair do espaço <strong>{activeTeam.nome}</strong>? Você perderá acesso às conversas compartilhadas e precisará de um novo convite para retornar.
            </p>
            <div style={{ display: 'flex', gap: '12px', width: '100%' }}>
              <button
                type="button"
                className="btn btn-outline"
                style={{ flex: 1 }}
                onClick={() => setShowLeaveModal(false)}
                disabled={loading}
              >
                Cancelar
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ flex: 1, backgroundColor: 'var(--voll-red)', border: 'none', gap: '6px' }}
                onClick={confirmLeaveTeam}
                disabled={loading}
              >
                {loading ? <Loader2 size={16} className="spin" /> : <LogOut size={16} />}
                <span>Sair agora</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default TeamChat;
