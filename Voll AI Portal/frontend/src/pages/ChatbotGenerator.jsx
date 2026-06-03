import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { LayoutTemplate, Loader2, Copy, Check, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const Skeleton = () => (
  <div className="output-panel__loading">
    <div className="output-skeleton output-skeleton--line output-skeleton--short" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--med" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--short" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
    <div className="output-skeleton output-skeleton--line output-skeleton--med" />
    <div className="output-skeleton output-skeleton--line output-skeleton--full" />
  </div>
);

const ChatbotGenerator = () => {
  const location = useLocation();
  const { user } = useAuth();
  
  const [formData, setFormData] = useState(
    location.state?.formData || {
      nomeCliente:  '',
      segmento:     '',
      objetivo:     '',
      etapas:       '',
      integracoes:  '',
      tom:          'Formal',
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
    `Crie um fluxo de chatbot para uma empresa do segmento ${formData.segmento}.\n\nObjetivo do fluxo:\n${formData.objetivo}\n\nEtapas principais:\n${formData.etapas}\n\nIntegrações necessárias:\n${formData.integracoes}\n\nTom de comunicação: ${formData.tom}\n\nRetorne um fluxo estruturado com etapas claras.`;

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
          type: 'ChatbotFlow',
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
        <h1>Modelos de Fluxo de Atendimento</h1>
        <p>Estruture fluxos de suporte padronizados para garantir a qualidade do atendimento.</p>
      </div>

      <div className="generator-grid">

        {/* ── LEFT: Form ── */}
        <div className="form-card">
          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label htmlFor="cb-cliente">Nome do Cliente / Empresa</label>
              <input id="cb-cliente" type="text" className="form-control" name="nomeCliente"
                value={formData.nomeCliente} onChange={handleChange}
                placeholder="Ex: Acme Corp" required />
            </div>

            <div className="form-group">
              <label htmlFor="cb-segmento">Segmento da Empresa</label>
              <input id="cb-segmento" type="text" className="form-control" name="segmento"
                value={formData.segmento} onChange={handleChange}
                placeholder="Ex: E-commerce, Saúde, Tecnologia…" required />
            </div>

            <div className="form-group">
              <label htmlFor="cb-objetivo">Objetivo do Fluxo</label>
              <textarea id="cb-objetivo" className="form-control" name="objetivo"
                value={formData.objetivo} onChange={handleChange} rows={3} required
                placeholder="Ex: Resolver dúvidas comuns, agendar consultas, qualificar leads…" />
            </div>

            <div className="form-group">
              <label htmlFor="cb-etapas">Etapas Principais</label>
              <textarea id="cb-etapas" className="form-control" name="etapas"
                value={formData.etapas} onChange={handleChange} rows={2} required
                placeholder="Ex: Saudação → Menu Principal → Falar com Atendente" />
            </div>

            <div className="form-group">
              <label htmlFor="cb-integracoes">Integrações Necessárias</label>
              <input id="cb-integracoes" type="text" className="form-control" name="integracoes"
                value={formData.integracoes} onChange={handleChange}
                placeholder="Ex: WhatsApp, Zendesk, CRM Interno" />
            </div>

            <div className="form-group">
              <label htmlFor="cb-tom">Tom de Comunicação</label>
              <select id="cb-tom" className="form-control" name="tom"
                value={formData.tom} onChange={handleChange}>
                <option value="Formal">Formal</option>
                <option value="Amigável">Amigável</option>
                <option value="Comercial">Comercial</option>
                <option value="Técnico">Técnico</option>
              </select>
            </div>

            {error && (
              <p style={{ fontSize: '0.83rem', color: 'var(--voll-red)', marginBottom: '12px' }}>
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary"
              disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
              {loading ? <Loader2 size={17} className="spin" /> : <LayoutTemplate size={17} />}
              {loading ? 'Gerando fluxo…' : 'Gerar Fluxo de Atendimento'}
            </button>
          </form>
        </div>

        {/* ── RIGHT: Output panel ── */}
        <div className="output-panel">
          <div className="output-panel__header">
            <span className="output-panel__title">
              <FileText size={14} />
              Fluxo Gerado
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
                <LayoutTemplate size={40} />
                <p>Preencha o formulário e clique em <strong>Gerar Fluxo</strong> para ver o resultado aqui.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ChatbotGenerator;
