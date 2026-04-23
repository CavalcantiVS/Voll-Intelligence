import React, { useState } from 'react';
import { FileText, Loader2, Copy, Check } from 'lucide-react';

const DocsGenerator = () => {
  const [formData, setFormData] = useState({
    nomeSistema: '',
    descricao: '',
    tecnologias: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const generatePrompt = () => {
    return `Gere uma documentação técnica estruturada para o seguinte sistema/integração.
    
Nome do Sistema ou API:
${formData.nomeSistema}

Descrição da Funcionalidade:
${formData.descricao}

Tecnologias Envolvidas:
${formData.tecnologias}

Retorne uma estrutura de documentação clara contendo Visão Geral, Endpoints/Eventos principais e Casos de Uso.`;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const prompt = generatePrompt();

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'Documentation' })
      });

      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao conectar com o servidor.');
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
        <h1>Gerador de Documentação Técnica</h1>
        <p>Gere e estruture rapidamente a documentação das suas APIs ou fluxos internos.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Nome do Sistema ou Integração</label>
            <input type="text" className="form-control" name="nomeSistema" value={formData.nomeSistema} onChange={handleChange} placeholder="Ex: API de Autenticação Voll" required />
          </div>

          <div className="form-group">
            <label>Descrição detalhada da funcionalidade</label>
            <textarea className="form-control" name="descricao" value={formData.descricao} onChange={handleChange} placeholder="Ex: Integração via webhook para envio de relatórios semanais..." rows={4} required></textarea>
          </div>

          <div className="form-group">
            <label>Tecnologias Envolvidas</label>
            <input type="text" className="form-control" name="tecnologias" value={formData.tecnologias} onChange={handleChange} placeholder="Ex: Node.js, Webhooks, WhatsApp API" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <FileText size={18} />}
            {loading ? 'Gerando documentação...' : 'Gerar documentação com IA'}
          </button>
        </form>

        {result && (
          <div className="response-box">
            <h3>Resultado Gerado</h3>
            <div className="response-content">{result.result}</div>
            <div className="response-actions">
              <button type="button" className="btn btn-outline" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Documentação'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DocsGenerator;
