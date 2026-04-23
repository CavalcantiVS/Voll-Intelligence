import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Zap, MessageSquare, FileText, Code, PenTool } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: 'Criar fluxo de chatbot',
      desc: 'Gere fluxos de atendimento completos a partir do objetivo do cliente.',
      icon: <Bot size={28} />,
      path: '/chatbots'
    },
    {
      title: 'Gerar resposta de atendimento',
      desc: 'Crie respostas otimizadas e adequadas ao tom de voz da marca.',
      icon: <MessageSquare size={28} />,
      path: '/responses'
    },
    {
      title: 'Criar automação',
      desc: 'Desenhe lógicas de automação para processos internos ou de atendimento.',
      icon: <Zap size={28} />,
      path: '/automations'
    },
    {
      title: 'Gerar documentação técnica',
      desc: 'Documente integrações e APIs rapidamente.',
      icon: <FileText size={28} />,
      path: '/docs'
    },
    {
      title: 'Melhorar texto de atendimento',
      desc: 'Refine mensagens para maior clareza e empatia.',
      icon: <PenTool size={28} />,
      path: '/refine'
    },
    {
      title: 'Criar prompt personalizado',
      desc: 'Crie e salve prompts específicos usando os padrões Voll.',
      icon: <Code size={28} />,
      path: '/prompts'
    }
  ];

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <h1>Olá, Admin User 👋</h1>
        <p>Bem-vindo ao Voll AI Portal. O que vamos criar hoje?</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon primary">
            <Zap size={24} />
          </div>
          <div className="stat-info">
            <h3>Gerações Hoje</h3>
            <p>124</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon secondary">
            <Bot size={24} />
          </div>
          <div className="stat-info">
            <h3>Fluxos Criados</h3>
            <p>38</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon primary">
            <MessageSquare size={24} />
          </div>
          <div className="stat-info">
            <h3>Respostas Geradas</h3>
            <p>850</p>
          </div>
        </div>
      </div>

      <div className="features-grid">
        {features.map((feature, index) => (
          <div 
            key={index} 
            className="feature-card" 
            onClick={() => navigate(feature.path)}
          >
            <div className="feature-icon">
              {feature.icon}
            </div>
            <h3>{feature.title}</h3>
            <p>{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
