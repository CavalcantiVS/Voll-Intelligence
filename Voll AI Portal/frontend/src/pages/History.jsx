import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { History as HistoryIcon, Copy, RotateCcw, Download, Clock, Inbox } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ----------------------------------------------------------------
   History card skeleton
   Mirrors the real history-card layout: header + two-column body
---------------------------------------------------------------- */
const HistoryCardSkeleton = () => (
  <div className="sk-history-card">
    {/* Header row */}
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

    {/* Body: two panes side-by-side */}
    <div className="sk-history-card__body">
      {/* Left pane */}
      <div className="sk-history-pane">
        <div className="sk sk-h-xs sk-w-30" style={{ marginBottom: 2 }} />
        <div className="sk sk-h-xxl sk-w-full" style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
      {/* Right pane */}
      <div className="sk-history-pane">
        <div className="sk sk-h-xs sk-w-30" style={{ marginBottom: 2 }} />
        <div className="sk sk-h-xxl sk-w-full" style={{ borderRadius: 'var(--radius-md)' }} />
      </div>
    </div>
  </div>
);

/* ── History Page ───────────────────────────────────────────── */
const History = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  const fetchHistory = useCallback(async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`http://localhost:3001/api/history?userId=${user.id}`);
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
    };
    return labels[type] || type;
  };

  const formatDate = (ts) =>
    new Date(ts).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

  return (
    <div className="history-page">
      <div className="dashboard-header">
        <h1>Histórico de Gerações</h1>
        <p>Acompanhe todos os prompts enviados e respostas geradas.</p>
      </div>

      {/* ── Skeleton while loading ── */}
      {loading && (
        <div className="history-list">
          {Array.from({ length: 3 }).map((_, i) => (
            <HistoryCardSkeleton key={i} />
          ))}
        </div>
      )}

      {/* ── Error state ── */}
      {error && !loading && (
        <div style={{ color: 'var(--voll-red)', backgroundColor: 'rgba(224,8,46,0.1)', padding: '12px 16px', borderRadius: '8px', marginBottom: '24px', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── Empty state ── */}
      {!loading && !error && history.length === 0 && (
        <div className="history-empty">
          <Inbox size={36} />
          <p>Nenhuma geração registrada ainda.</p>
        </div>
      )}

      {/* ── History list ── */}
      {!loading && history.length > 0 && (
        <div className="history-list">
          {history.map((item) => (
            <div key={item.id} className="history-card">

              {/* Card header */}
              <div className="history-card__header">
                <div className="history-card__meta">
                  <span className="badge badge-red">{formatType(item.type)}</span>
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
                </div>
              </div>

              {/* Card body — two columns */}
              <div className="history-card__body">
                <div className="history-pane">
                  <p className="history-pane__label">Prompt Original</p>
                  <div className="history-pane__content">
                    {item.original_prompt}
                  </div>
                </div>

                <div className="history-pane history-pane--response">
                  <p className="history-pane__label">Resposta Gerada</p>
                  <div className="history-pane__content">
                    {item.ai_response}
                  </div>
                </div>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default History;
