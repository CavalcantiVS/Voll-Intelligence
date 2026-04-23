import React, { useState } from 'react';
import { MessageSquare, Loader2, Copy, Check } from 'lucide-react';

const ResponseGenerator = () => {
  const [formData, setFormData] = useState({
    mensagem: '',
    contexto: '',
    tom: 'Amigável'
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePrompt = () => {
    return `Gere uma resposta de atendimento ideal baseada nas informações abaixo.
    
Mensagem do cliente:
${formData.mensagem}

Contexto da conversa:
${formData.contexto}

Tom desejado:
${formData.tom}

Crie uma resposta adequada, sem placeholders e pronta para ser enviada ao cliente.`;
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
          type: 'ResponseGenerator'
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
        <h1>Gerador de Respostas</h1>
        <p>Crie respostas prontas para atendimento ao cliente baseando-se no contexto e tom desejado.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Mensagem do cliente</label>
            <textarea 
              className="form-control" 
              name="mensagem" 
              value={formData.mensagem} 
              onChange={handleChange} 
              placeholder="Ex: Minha fatura veio com valor incorreto e o sistema está fora do ar..."
              rows={4}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Contexto da conversa (Opcional mas recomendado)</label>
            <textarea 
              className="form-control" 
              name="contexto" 
              value={formData.contexto} 
              onChange={handleChange} 
              placeholder="Ex: O cliente já ligou 3 vezes antes. Há uma instabilidade geral na nossa plataforma desde as 10h."
              rows={3}
            ></textarea>
          </div>

          <div className="form-group">
            <label>Tom deseado</label>
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
            {loading ? <Loader2 size={18} className="animate-spin" /> : <MessageSquare size={18} />}
            {loading ? 'Gerando resposta...' : 'Gerar resposta com IA'}
          </button>
        </form>

        {result && (
          <div className="response-box">
            <h3>Resultado Gerado</h3>
            <div className="response-content">
              {result.result}
            </div>
            
            <div style={{ marginTop: '20px', padding: '16px', backgroundColor: '#f8fafc', borderRadius: '4px', fontSize: '0.85rem' }}>
              <strong>Prompt Sanitizado:</strong>
              <pre style={{ whiteSpace: 'pre-wrap', marginTop: '8px', color: '#64748b' }}>{result.sanitizedPrompt}</pre>
            </div>

            <div className="response-actions">
              <button type="button" className="btn btn-outline" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Resposta'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResponseGenerator;
