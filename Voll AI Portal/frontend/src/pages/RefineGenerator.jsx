import React, { useState } from 'react';
import { PenTool, Loader2, Copy, Check } from 'lucide-react';

const RefineGenerator = () => {
  const [formData, setFormData] = useState({ textoLocal: '', objetivo: '' });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);

    const prompt = `Melhore e refine o seguinte texto de atendimento.
    
Texto Original:
${formData.textoLocal}

Objetivo da melhoria:
${formData.objetivo}

Retorne um texto com mais empatia, clareza e que seja apropriado para o atendimento ao cliente.`;

    try {
      const response = await fetch('http://localhost:3001/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, type: 'TextRefinement' })
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
        <h1>Melhorar Texto de Atendimento</h1>
        <p>Cole um texto rápido e veja nossa IA refiná-lo para a versão ideal.</p>
      </div>

      <div className="form-card">
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Texto Original</label>
            <textarea className="form-control" name="textoLocal" value={formData.textoLocal} onChange={(e) => setFormData({...formData, textoLocal: e.target.value})} placeholder="Ex: o sistema caiu, não sei quando volta, aguarde" rows={4} required></textarea>
          </div>

          <div className="form-group">
            <label>Como deseja melhorá-lo?</label>
            <input type="text" className="form-control" name="objetivo" value={formData.objetivo} onChange={(e) => setFormData({...formData, objetivo: e.target.value})} placeholder="Ex: Deixar mais educado e profissional" required />
          </div>

          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? <Loader2 size={18} className="animate-spin" /> : <PenTool size={18} />}
            {loading ? 'Refinando texto...' : 'Refinar texto com IA'}
          </button>
        </form>

        {result && (
          <div className="response-box">
            <h3>Texto Refinado</h3>
            <div className="response-content">{result.result}</div>
            <div className="response-actions">
              <button type="button" className="btn btn-outline" onClick={handleCopy}>
                {copied ? <Check size={16} /> : <Copy size={16} />}
                {copied ? 'Copiado!' : 'Copiar Texto'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RefineGenerator;
