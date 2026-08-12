import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Copy, RotateCcw, Download, Clock, Inbox, Trash2, ChevronDown, ChevronUp, Search, Filter } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import API_URL from '../api';

/* ----------------------------------------------------------------
   Skeleton do card de histórico
   Reflete o layout real do card de histórico: cabeçalho + corpo em duas colunas
---------------------------------------------------------------- */
const HistoryCardSkeleton = () => (
  <div className="sk-history-card">
    {/* Linha do cabeçalho */}
    <div className="sk-history-card__header">
      <div className="sk-history-card__header-left">
        <div className="sk sk-h-md" style={{ width: 130, borderRadius: 'var(--radius-full)' }} />
        <div className="sk sk-h-xs" style={{ width: 110 }} />
      </div>
      <div className="sk-history-card__header-right">
        <div className="sk sk-btn" />
        <div className="sk sk-btn" />
        <div className="sk sk-btn" />
      </div>
    </div>

    {/* Corpo: dois painéis lado a lado */}
    <div className="sk-history-card__body">
      {/* Painel esquerdo */}
      <div className="sk-history-pane">
        <div className="sk sk-h-xs sk-w-30" style={{ marginBottom: 2 }} />
        <div className="sk sk-h-xxl sk-w-full" style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
      {/* Painel direito */}
      <div className="sk-history-pane">
        <div className="sk sk-h-xs sk-w-30" style={{ marginBottom: 2 }} />
        <div className="sk sk-h-xxl sk-w-full" style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  </div>
);

/* ── Página de Histórico ───────────────────────────────────────────── */
const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);
  const [expandedIds, setExpandedIds] = useState({});

  // Estados de filtragem
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/api/history?userId=${user.id}`);
      if (!res.ok) throw new Error('Falha ao carregar');
      const data = await res.json();
      setHistory(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch history', err);
      setError('Não foi possível carregar os dados. Tente novamente mais tarde.');
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  const handleCopy = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExport = (item) => {
    const content = `Tipo: ${formatType(item.type)}\nData: ${new Date(item.created_at).toLocaleString('pt-BR')}\n\nPrompt Original:\n${item.original_prompt}\n\nResposta da IA:\n${item.ai_response}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voll-export-${item.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleReuse = (item) => {
    const routeMap = {
      ChatbotFlow: '/chatbots',
      ResponseGenerator: '/responses',
      Automation: '/automations'
    };
    const route = routeMap[item.type];
    if (route) {
      navigate(route, { state: { formData: item.form_data } });
    }
  };

  const formatType = (type) => {
    const labels = {
      ChatbotFlow:       'Fluxo de Atendimento',
      ResponseGenerator: 'Resposta de Atendimento',
      Automation:        'Automação Interna',
      Documentation:     'Documentação Técnica',
      PromptEngineering: 'Engenharia de Prompt',
      TextRefinement:    'Melhoria de Texto',
    };
    return labels[type] || type;
  };

  const getBadgeClass = (type) => {
    const classes = {
      ChatbotFlow:       'badge-blue',
      ResponseGenerator: 'badge-green',
      Automation:        'badge-purple',
      Documentation:     'badge-orange',
      PromptEngineering: 'badge-teal',
      TextRefinement:    'badge-pink',
    };
    return `badge ${classes[type] || 'badge-gray'}`;
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  const toggleExpand = (id) => {
    setExpandedIds(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Tem certeza que deseja apagar este registro?')) return;
    try {
      const res = await fetch(`${API_URL}/api/history/${id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Falha ao deletar');
      setHistory(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error(err);
      alert('Não foi possível apagar o registro.');
    }
  };

  // Execução memoizada de filtro e busca
  const categories = useMemo(() => {
    return [
      { id: 'all', label: 'Todos' },
      { id: 'ChatbotFlow', label: 'Fluxos' },
      { id: 'ResponseGenerator', label: 'Respostas' },
      { id: 'Automation', label: 'Automações' },
      { id: 'Documentation', label: 'Docs' },
      { id: 'PromptEngineering', label: 'Prompts' },
      { id: 'TextRefinement', label: 'Refinamentos' },
    ];
  }, []);

  const filteredHistory = useMemo(() => {
    return history.filter(item => {
      const matchesFilter = selectedFilter === 'all' || item.type === selectedFilter;
      const matchesSearch = searchQuery.trim() === '' || 
        (item.original_prompt || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.ai_response || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        formatType(item.type).toLowerCase().includes(searchQuery.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [history, selectedFilter, searchQuery]);

  return (
    <div className="history-page">
      <div className="dashboard-header">
        <h1>Histórico de Gerações</h1>
        <p>Acompanhe todos os prompts enviados e respostas geradas.</p>
      </div>

      {/* ── Skeleton durante o carregamento ── */}
      {loading && (
        <div className="history-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <HistoryCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Estado de erro ── */}
      {error && !loading && (
        <div style={{ color: 'var(--voll-red)', backgroundColor: 'rgba(224,8,46,0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── Estado vazio (Banco de dados vazio) ── */}
      {!loading && !error && history.length === 0 && (
        <div className="history-empty">
          <Inbox size={36} />
          <p>Nenhuma geração registrada ainda.</p>
        </div>
      )}

      {/* ── Barra de Busca e Filtros ── */}
      {!loading && !error && history.length > 0 && (
        <div className="history-filters-container">
          <div className="history-search-wrapper" style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }} />
            <input
              type="text"
              placeholder="Pesquisar por palavras-chave..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-control history-search-input"
              style={{ paddingLeft: '36px' }}
            />
          </div>
          
          <div className="history-filter-tabs">
            {categories.map(cat => {
              const count = cat.id === 'all' 
                ? history.length 
                : history.filter(h => h.type === cat.id).length;
              
              // Mostrar apenas botões de filtro para categorias que possuem registros (ou o botão 'all')
              if (cat.id !== 'all' && count === 0) return null;
              
              return (
                <button
                  key={cat.id}
                  className={`filter-tab ${selectedFilter === cat.id ? 'active' : ''}`}
                  onClick={() => setSelectedFilter(cat.id)}
                >
                  {cat.label}
                  <span className="filter-count">{count}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Estado de Resultados de Busca Vazios ── */}
      {!loading && !error && history.length > 0 && filteredHistory.length === 0 && (
        <div className="history-empty" style={{ padding: '60px 20px', border: '1px dashed var(--border)', borderRadius: 'var(--radius-lg)' }}>
          <Filter size={36} style={{ color: 'var(--text-muted)', marginBottom: '12px' }} />
          <p>Nenhum registro encontrado para os filtros selecionados.</p>
          <button 
            className="btn btn-outline" 
            onClick={() => { setSelectedFilter('all'); setSearchQuery(''); }}
            style={{ marginTop: '12px' }}
          >
            Limpar Filtros
          </button>
        </div>
      )}

      {/* ── Lista de histórico ── */}
      {!loading && filteredHistory.length > 0 && (
        <div className="history-list">
          {filteredHistory.map((item) => (
            <div key={item.id} className="history-card">

              {/* Cabeçalho do card */}
              <div className="history-card__header">
                <div className="history-card__meta">
                  <span className={getBadgeClass(item.type)}>{formatType(item.type)}</span>
                  <span className="history-card__date">
                    <Clock size={13} />
                    {formatDate(item.created_at)}
                  </span>
                </div>

                <div className="history-card__actions">
                  <button
                    className="btn btn-outline"
                    onClick={() => handleCopy(item.ai_response, item.id)}
                    title="Copiar resposta"
                  >
                    <Copy size={15} />
                    {copiedId === item.id ? 'Copiado!' : 'Copiar'}
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleExport(item)}
                    title="Exportar TXT"
                  >
                    <Download size={15} />
                    Exportar
                  </button>
                  <button
                    className="btn btn-primary"
                    title="Reutilizar prompt"
                    onClick={() => handleReuse(item)}
                  >
                    <RotateCcw size={15} />
                    Reutilizar
                  </button>
                  <button
                    className="btn btn-danger"
                    title="Apagar registro"
                    onClick={() => handleDelete(item.id)}
                    style={{ padding: '8px' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>

              {/* Corpo do card — duas colunas */}
              <div className="history-card__body">
                <div className="history-pane">
                  <p className="history-pane__label">Prompt Original</p>
                  <div className={`history-pane__content ${expandedIds[item.id] ? 'history-pane__content--expanded' : ''}`}>
                    {item.original_prompt}
                    {!expandedIds[item.id] && <div className="history-pane__content-fade" />}
                  </div>
                </div>

                <div className="history-pane history-pane--response">
                  <p className="history-pane__label">Resposta Gerada</p>
                  <div className={`history-pane__content ${expandedIds[item.id] ? 'history-pane__content--expanded' : ''}`}>
                    {item.ai_response}
                    {!expandedIds[item.id] && <div className="history-pane__content-fade" />}
                  </div>
                </div>
              </div>

              <div style={{ padding: '0 20px 16px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--bg-surface)', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}>
                <button 
                  className="btn btn-outline" 
                  onClick={() => toggleExpand(item.id)}
                  style={{ width: '100%', justifyContent: 'center', border: 'none', color: 'var(--text-secondary)' }}
                >
                  {expandedIds[item.id] ? (
                    <><ChevronUp size={16} /> Recolher visualização</>
                  ) : (
                    <><ChevronDown size={16} /> Ampliar visualização</>
                  )}
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
