import React, { useState, useEffect } from 'react';
import { History as HistoryIcon, Copy, RotateCcw, Download, Clock } from 'lucide-react';

const History = () => {
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      setLoading(true);
      const res = await fetch('http://localhost:3001/api/history');
      const data = await res.json();
      if (Array.isArray(data)) {
        setHistory(data);
      } else {
        console.error('API returned non-array:', data);
        setHistory([]);
      }
    } catch (error) {
      console.error('Failed to fetch history', error);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    alert('Copiado para a área de transferência!');
  };

  const handleExport = (item) => {
    const content = `Tipo: ${item.type}\nData: ${new Date(item.created_at).toLocaleString()}\n\nPrompt Original:\n${item.original_prompt}\n\nResposta da IA:\n${item.ai_response}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `voll-ai-export-${item.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatType = (type) => {
    switch (type) {
      case 'ChatbotFlow': return 'Fluxo de Chatbot';
      case 'ResponseGenerator': return 'Resposta de Atendimento';
      case 'Automation': return 'Automação';
      default: return type;
    }
  };

  return (
    <div className="history-page">
      <div className="dashboard-header">
        <h1>Histórico de Gerações</h1>
        <p>Acompanhe todos os prompts enviados e respostas geradas pela IA.</p>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--color-text-light)' }}>
          <HistoryIcon className="animate-spin" size={32} style={{ margin: '0 auto 16px' }} />
          <p>Carregando histórico...</p>
        </div>
      ) : (
        <div className="history-list" style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {history.length === 0 ? (
            <div className="form-card" style={{ textAlign: 'center' }}>
              <p>Nenhum histórico encontrado.</p>
            </div>
          ) : (
            history.map((item) => (
              <div key={item.id} className="form-card" style={{ padding: '24px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px', borderBottom: '1px solid rgba(0,0,0,0.05)', paddingBottom: '16px' }}>
                  <div>
                    <span style={{ 
                      backgroundColor: 'rgba(246, 1, 81, 0.1)', 
                      color: 'var(--color-primary)', 
                      padding: '4px 12px', 
                      borderRadius: '16px', 
                      fontSize: '0.8rem', 
                      fontWeight: 600,
                      display: 'inline-block',
                      marginBottom: '8px'
                    }}>
                      {formatType(item.type)}
                    </span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-text-light)', fontSize: '0.85rem' }}>
                      <Clock size={14} />
                      {new Date(item.created_at).toLocaleString('pt-BR')}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button className="btn btn-outline" onClick={() => handleCopy(item.ai_response)} title="Copiar Resposta" style={{ padding: '8px' }}>
                      <Copy size={16} />
                    </button>
                    <button className="btn btn-outline" onClick={() => handleExport(item)} title="Exportar TXT" style={{ padding: '8px' }}>
                      <Download size={16} />
                    </button>
                    <button className="btn btn-primary" title="Reutilizar Prompt (Em breve)" style={{ padding: '8px' }}>
                      <RotateCcw size={16} />
                    </button>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--color-dark)', marginBottom: '8px' }}>Prompt Original</h4>
                    <div style={{ 
                      backgroundColor: '#f8fafc', 
                      padding: '12px', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      color: 'var(--color-text-light)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto'
                    }}>
                      {item.original_prompt}
                    </div>
                  </div>
                  
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--color-dark)', marginBottom: '8px' }}>Resposta Gerada</h4>
                    <div style={{ 
                      backgroundColor: 'rgba(246, 1, 81, 0.02)', 
                      padding: '12px', 
                      borderRadius: '4px', 
                      fontSize: '0.85rem',
                      color: 'var(--color-text-main)',
                      whiteSpace: 'pre-wrap',
                      maxHeight: '200px',
                      overflowY: 'auto',
                      border: '1px solid rgba(246, 1, 81, 0.1)'
                    }}>
                      {item.ai_response}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default History;
