import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Settings, Loader2, Copy, Check, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Skeleton = () => (
  <div className="output-panel__loading">
    <div className="output-skeleton output-skeleton--line output-skeleton--med" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--short" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--med" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
  </div>
);

const AutomationGenerator = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState(
    location.state?.formData || {
      processo:  '',
      sistemas:  '',
      resultado: '',
    }
  );

  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null);
  const [error,   setError]   = useState('');
  const [copied,  setCopied]  = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const buildPrompt = () =>
    `Desenhe uma automação detalhada para o processo descrito abaixo.\n\nProcesso que deseja automatizar:\n${formData.processo}\n\nSistemas envolvidos:\n${formData.sistemas}\n\nResultado esperado:\n${formData.resultado}\n\nRetorne:\n1. Uma sugestão de arquitetura de automação.\n2. A lógica estruturada do fluxo passo a passo.\n3. Pseudocódigo ou estrutura de dados sugerida (Payloads, Webhooks, etc).`;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    setError('');

    try {
      const res = await fetch('http://localhost:3001/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          prompt: buildPrompt(), 
          type: 'Automation',
          userId: user?.id,
          formData,
          dlpLevel: localStorage.getItem('dlp_level') || 'rigoroso',
          aiModel: localStorage.getItem('ai_model') || 'gpt-4o',
          aiTemp: localStorage.getItem('ai_temp') || '0.7'
        }),
      });
      const data = await res.json();
      setResult(data.result ?? data);
    } catch (err) {
      console.error(err);
      setError('Não foi possível conectar ao servidor. Verifique se o backend está rodando.');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result) return;
    navigator.clipboard.writeText(typeof result === 'string' ? result : result.result ?? '');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const outputText = typeof result === 'string' ? result : result?.result ?? '';

  return (
    <div className="generator-page">
      <div className="dashboard-header">
        <h1>Modelos de Automação Interna</h1>
        <p>Configure lógicas de integração e automação de processos com suporte estruturado.</p>
      </div>

      <div className="generator-grid">

        {/* ── LEFT: Form ── */}
        <div className="form-card">
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="auto-processo">Processo a Automatizar</label>
              <textarea id="auto-processo" className="form-control" name="processo"
                value={formData.processo} onChange={handleChange} rows={4} required
                placeholder="Ex: Quando um lead for ganho no CRM, criar um projeto no Asana e enviar mensagem no Slack…" />
            </div>

            <div className="form-group">
              <label htmlFor="auto-sistemas">Sistemas Envolvidos</label>
              <input id="auto-sistemas" type="text" className="form-control" name="sistemas"
                value={formData.sistemas} onChange={handleChange} required
                placeholder="Ex: HubSpot, Asana, Slack, n8n, Make" />
            </div>

            <div className="form-group">
              <label htmlFor="auto-resultado">Resultado Esperado</label>
              <textarea id="auto-resultado" className="form-control" name="resultado"
                value={formData.resultado} onChange={handleChange} rows={3} required
                placeholder="Ex: Aumentar a velocidade de onboarding e não perder detalhes do projeto vendido." />
            </div>

            {error && (
              <p style={{ fontSize: '0.83rem', color: 'var(--voll-red)', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary"
              disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <Loader2 size={17} className="spin" /> : <Settings size={17} />}
              {loading ? 'Gerando automação…' : 'Gerar Modelo de Automação'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Output panel ── */}
        <div className="output-panel">
          <div className="output-panel__header">
            <span className="output-panel__title">
              <FileText size={14} />
              Arquitetura Gerada
            </span>
            {outputText && (
              <div className="output-panel__actions">
                <button className="btn btn-outline" onClick={handleCopy}
                  style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
            )}
          </div>

          <div className="output-panel__body">
            {loading ? (
              <Skeleton />
            ) : outputText ? (
              <p className="output-text">{outputText}</p>
            ) : (
              <div className="output-panel__empty">
                <Settings size={40} />
                <p>Preencha o formulário e clique em <strong>Gerar Modelo</strong> para ver o resultado aqui.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AutomationGenerator;
