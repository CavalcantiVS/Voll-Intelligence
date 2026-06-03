import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Headset, Loader2, Copy, Check, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

/* ----------------------------------------------------------------
   Shared skeleton rows while AI is generating
---------------------------------------------------------------- */
const Skeleton = () => (
  <div className="output-panel__loading">
    <div className="output-skeleton output-skeleton--line output-skeleton--short" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--med" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--short" />
    <div className="output-skeleton output-skeleton--line output-skeleton--med" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
  </div>
);

const ResponseGenerator = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState(
    location.state?.formData || {
      mensagem:    '',
      acaoDesejada: 'dúvida',
      tom:          'empática',
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
    `Aja como o assistente de suporte da Voll Solutions. Responda a seguinte ${formData.acaoDesejada} do cliente de forma ${formData.tom}:\n\n${formData.mensagem}`;

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
          type: 'ResponseGenerator',
          userId: user?.id,
          formData
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
      {/* Page header */}
      <div className="dashboard-header">
        <h1>Assistente de Redação Voll</h1>
        <p>Crie respostas prontas para atendimento baseadas no tipo de ocorrência e tom desejado.</p>
      </div>

      {/* Two-column grid */}
      <div className="generator-grid">

        {/* ── LEFT: Form ── */}
        <div className="form-card">
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="rg-acao">Tipo de Ocorrência</label>
              <select id="rg-acao" className="form-control" name="acaoDesejada"
                value={formData.acaoDesejada} onChange={handleChange}>
                <option value="dúvida">Dúvida</option>
                <option value="reclamação">Reclamação</option>
                <option value="solicitação">Solicitação</option>
                <option value="sugestão">Sugestão</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="rg-mensagem">Mensagem do Cliente</label>
              <textarea id="rg-mensagem" className="form-control" name="mensagem"
                value={formData.mensagem} onChange={handleChange} rows={5} required
                placeholder="Cole ou descreva o conteúdo da mensagem do cliente…" />
            </div>

            <div className="form-group">
              <label htmlFor="rg-tom">Tom de Resposta</label>
              <select id="rg-tom" className="form-control" name="tom"
                value={formData.tom} onChange={handleChange}>
                <option value="empática">Empático</option>
                <option value="formal">Formal</option>
                <option value="comercial">Comercial</option>
                <option value="técnica">Técnico</option>
              </select>
            </div>

            {error && (
              <p style={{ fontSize: '0.83rem', color: 'var(--voll-red)', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary"
              disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <Loader2 size={17} className="spin" /> : <Headset size={17} />}
              {loading ? 'Gerando resposta…' : 'Gerar Resposta'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Output panel ── */}
        <div className="output-panel">
          <div className="output-panel__header">
            <span className="output-panel__title">
              <FileText size={14} />
              Resposta Gerada
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
                <Headset size={40} />
                <p>Preencha o formulário e clique em <strong>Gerar Resposta</strong> para ver o resultado aqui.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ResponseGenerator;
