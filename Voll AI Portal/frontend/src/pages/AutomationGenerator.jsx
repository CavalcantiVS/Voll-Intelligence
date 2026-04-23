import React, { useState } from 'react';
import { Zap, Loader2, Copy, Check } from 'lucide-react';

const AutomationGenerator = () => {
  const [formData, setFormData] = useState({
    processo: '',
    sistemas: '',
    resultado: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePrompt = () => {
    return `Desenhe uma automação detalhada para o processo descrito abaixo.
    
Processo que deseja automatizar:
${formData.processo}

Sistemas envolvidos:
${formData.sistemas}

Resultado esperado:
${formData.resultado}

Retorne:
1. Uma sugestão de arquitetura de automação.
2. A lógica estruturada do fluxo passo-a-passo.
3. Pseudocódigo ou estrutura de dados sugerida (Payloads, Webhooks, etc).`;
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
          type: 'Automation'
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
        <h1>Gerador de Automação</h1>
        <p>Estruture lógicas de integração e automatização de processos complexos usando IA.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Processo que deseja automatizar</label>
            <textarea 
              className="form-control" 
              name="processo" 
              value={formData.processo} 
              onChange={handleChange} 
              placeholder="Ex: Quando um lead for ganho no CRM, criar um projeto no Asana e enviar mensagem no Slack..."
              rows={3}
              required
            ></textarea>
          </div>

          <div className="form-group">
            <label>Sistemas envolvidos</label>
            <input 
              type="text" 
              className="form-control" 
              name="sistemas" 
              value={formData.sistemas} 
              onChange={handleChange} 
              placeholder="Ex: HubSpot, Asana, Slack, n8n, Make"
              required
            />
          </div>

          <div className="form-group">
            <label>Resultado esperado</label>
            <textarea 
              className="form-control" 
              name="resultado" 
              value={formData.resultado} 
              onChange={handleChange} 
              placeholder="Ex: Aumentar a velocidade de onboarding e não perder detalhes do projeto vendido."
              rows={2}
              required
            ></textarea>
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Zap size={18} />}
            {loading ? 'Gerando automação...' : 'Gerar automação com IA'}
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
                {copied ? 'Copiado!' : 'Copiar Automação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AutomationGenerator;
