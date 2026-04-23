import React, { useState } from 'react';
import { Bot, Loader2, Copy, Check } from 'lucide-react';

const ChatbotGenerator = () => {
  const [formData, setFormData] = useState({
    nomeCliente: '',
    segmento: '',
    objetivo: '',
    etapas: '',
    integracoes: '',
    tom: 'Formal'
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePrompt = () => {
    return `Crie um fluxo de chatbot para uma empresa do segmento ${formData.segmento}.
    
Objetivo do fluxo:
${formData.objetivo}

Etapas principais:
${formData.etapas}

Integrações necessárias:
${formData.integracoes}

Tom de comunicação:
${formData.tom}

Retorne um fluxo estruturado com etapas claras.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const prompt = generatePrompt();

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt,
          type: 'ChatbotFlow'
        })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao conectar com o servidor. O backend está rodando no porto 3001?');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (result && result.result) {
      navigator.clipboard.writeText(result.result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="generator-page">
      <div className="dashboard-header">
        <h1>Gerador de Fluxo de Chatbot</h1>
        <p>Preencha os dados abaixo para estruturar automaticamente um fluxo de atendimento.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do cliente</label>
            <input 
              type="text" 
              className="form-control" 
              name="nomeCliente" 
              value={formData.nomeCliente} 
              onChange={handleChange} 
              placeholder="Ex: Acme Corp"
              required
            />
          </div>

          <div className="form-group">
            <label>Segmento da empresa</label>
            <input 
              type="text" 
              className="form-control" 
              name="segmento" 
              value={formData.segmento} 
              onChange={handleChange} 
              placeholder="Ex: E-commerce, Saúde, Tecnologia..."
              required
            />
          </div>

          <div className="form-group">
            <label>Objetivo do fluxo</label>
            <textarea 
              className="form-control" 
              name="objetivo" 
              value={formData.objetivo} 
              onChange={handleChange} 
              placeholder="Ex: Vender um produto, resolver dúvias comuns, agendar consultas..."
              rows={3}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Etapas principais do fluxo</label>
            <textarea 
              className="form-control" 
              name="etapas" 
              value={formData.etapas} 
              onChange={handleChange} 
              placeholder="Ex: Saudação -> Menu Principal -> Falar com Atendente"
              rows={3}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Integrações necessárias</label>
            <input 
              type="text" 
              className="form-control" 
              name="integracoes" 
              value={formData.integracoes} 
              onChange={handleChange} 
              placeholder="Ex: WhatsApp, Zendesk, CRM Interno"
              required
            />
          </div>

          <div className="form-group">
            <label>Tom da comunicação</label>
            <select 
              className="form-control" 
              name="tom" 
              value={formData.tom} 
              onChange={handleChange}
            >
              <option value="Formal">Formal</option>
              <option value="Amigável">Amigável</option>
              <option value="Comercial">Comercial</option>
              <option value="Técnico">Técnico</option>
            </select>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Bot size={18} />}
            {loading ? 'Gerando fluxo...' : 'Gerar fluxo com IA'}
          </button>
        </form>

        {result && (
          <div className="response-box">
            <h3>Resultado Gerado</h3>
            <div className="response-content">
              {result.result}
            </div>
            
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong>Prompt Sanitizado Enviado:</strong> (Email, Telefones e CPF seriam ocultados)
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#64748b' }}>{result.sanitizedPrompt}</pre>
            </div>

            <div className="response-actions">
              <button type="button" className="btn btn-outline" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Resultado'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatbotGenerator;
