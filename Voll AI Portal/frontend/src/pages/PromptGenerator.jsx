import React, { useState } from 'react';
import { Code, Loader2, Copy, Check } from 'lucide-react';

const PromptGenerator = () => {
  const [formData, setFormData] = useState({ objetivo: '', contexto: '', parametros: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const prompt = `Seja um engenheiro de prompt especialista. Crie o prompt perfeito para o seguinte cenário.
    
Objetivo da tarefa:
${formData.objetivo}

Contexto / Informações de fundo:
${formData.contexto}

Parâmetros ou Restrições adicionais:
${formData.parametros}

Retorne um prompt altamente qualificado, detalhado e pronto para ser copiado e colado em uma IA como GPT-4.`;

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'PromptEngineering' })
      });
      const data = await response.json();
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      alert('Erro ao conectar com o backend.');
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
        <h1>Criar Prompt Personalizado</h1>
        <p>Receba de volta o prompt ideal para usar em qualquer IA, focado nos seus objetivos.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Objetivo da Tarefa</label>
            <textarea className="form-control" name="objetivo" value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} placeholder="Ex: Analisar os dados de uma planilha CSV e extrair insights de cancelamentos..." rows={3} required></textarea>
          </div>

          <div className="form-group">
            <label>Contexto / Background</label>
            <textarea className="form-control" name="contexto" value={formData.contexto} onChange={(e) => setFormData({...formData, contexto: e.target.value})} placeholder="Ex: Somos uma empresa SaaS B2B, vendemos software de RH..." rows={2} required></textarea>
          </div>

          <div className="form-group">
            <label>Parâmetros Especiais</label>
            <input type="text" className="form-control" name="parametros" value={formData.parametros} onChange={(e) => setFormData({...formData, parametros: e.target.value})} placeholder="Ex: O output não pode exceder 300 palavras, use formato JSON" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <Code size={18} />}
            {loading ? 'Criando super prompt...' : 'Gerar Super Prompt'}
          </button>
        </form>

        {result && (
          <div className="response-box">
            <h3>Seu Prompt Está Pronto</h3>
            <div className="response-content">{result.result}</div>
            <div className="response-actions">
              <button type="button" className="btn btn-outline" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Prompt'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PromptGenerator;
