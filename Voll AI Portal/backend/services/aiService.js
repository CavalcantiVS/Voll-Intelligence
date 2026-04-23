const OpenAI = require('openai');

/**
 * Service to handle communication with OpenAI API
 * Falls back to mock responses if OPENAI_API_KEY is not configured
 */
class AIService {
  constructor() {
    this.useRealAI = !!process.env.OPENAI_API_KEY;
    
    if (this.useRealAI) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o';
      console.log(`[AIService] Using real OpenAI API (model: ${this.model})`);
    } else {
      console.warn('[AIService] OPENAI_API_KEY not set — running in mock mode');
    }
  }

  /**
   * Generate a response for tool prompts (chatbot, automation, etc.)
   */
  async generateResponse(sanitizedPrompt, type) {
    if (this.useRealAI) {
      return this._callOpenAI([
        { role: 'system', content: this._getSystemPrompt(type) },
        { role: 'user', content: sanitizedPrompt }
      ]);
    }
    return this._mockResponse(type);
  }

  /**
   * Generate a chat response with full conversation history
   * @param {Array} messages - Array of {role, content} objects
   */
  async generateChatResponse(messages) {
    const systemMessage = {
      role: 'system',
      content: `Você é o Voll AI, um assistente corporativo interno da Voll Solutions — empresa especializada em automação de atendimento, chatbots e soluções omnichannel.

Suas responsabilidades:
- Ajudar equipes internas a criar fluxos de chatbot, respostas de atendimento e automações
- Sugerir boas práticas para atendimento via WhatsApp, Instagram e outros canais de mensageria
- Gerar documentação técnica clara e objetiva
- Refinar textos e mensagens institucionais

Diretrizes de segurança:
- Nunca solicite ou repita dados sensíveis (CPF, senhas, dados bancários)
- Mantenha a confidencialidade das informações da empresa
- Responda sempre em Português do Brasil, de forma profissional e direta

Data/hora atual: ${new Date().toLocaleString('pt-BR')}`
    };

    if (this.useRealAI) {
      return this._callOpenAI([systemMessage, ...messages]);
    }
    return 'Olá! Sou o Voll AI. No momento estou em modo demonstração (sem chave de API configurada). Configure a variável `OPENAI_API_KEY` no backend para ativar as respostas reais.';
  }

  async _callOpenAI(messages) {
    const completion = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: 2048,
      temperature: 0.7,
    });
    return completion.choices[0].message.content;
  }

  _getSystemPrompt(type) {
    const prompts = {
      ChatbotFlow: 'Você é especialista em criação de fluxos de chatbot para atendimento ao cliente. Gere fluxos claros, estruturados em etapas numeradas, com mensagens prontas para cada passo.',
      ResponseGenerator: 'Você é especialista em comunicação corporativa e atendimento ao cliente. Gere respostas empáticas, profissionais e adequadas ao tom solicitado.',
      Automation: 'Você é especialista em automação de processos e integrações. Descreva fluxos de automação de forma clara, com gatilhos, condições e ações detalhadas.',
      Documentation: 'Você é especialista em documentação técnica. Estruture a documentação de forma clara com seções bem definidas: Visão Geral, Funcionalidades, Endpoints/Eventos, e Exemplos.',
      TextRefinement: 'Você é especialista em comunicação corporativa. Refine o texto mantendo a intenção original, mas melhorando clareza, empatia e profissionalismo.',
      PromptEngineering: 'Você é especialista em engenharia de prompts. Crie prompts detalhados, com contexto rico, instruções claras e formato de saída especificado.',
    };
    return prompts[type] || 'Você é um assistente corporativo da Voll Solutions. Responda de forma profissional e objetiva em Português do Brasil.';
  }

  _mockResponse(type) {
    const responses = {
      ChatbotFlow: `Fluxo de Chatbot gerado (modo demo):\n\n1. Saudação inicial\n2. Identificação da necessidade\n3. Direcionamento para atendente ou resolução automática\n4. Encerramento com pesquisa de satisfação.\n\n⚠️ Configure OPENAI_API_KEY para respostas reais.`,
      ResponseGenerator: `Olá! Agradecemos o seu contato. Entendemos a sua necessidade e estamos aqui para ajudar!\n\n⚠️ Configure OPENAI_API_KEY para respostas reais.`,
      Automation: `Fluxo de automação (modo demo):\n- Gatilho: Novo evento recebido\n- Ação 1: Classificar com IA\n- Ação 2: Encaminhar para fila correta\n\n⚠️ Configure OPENAI_API_KEY para respostas reais.`,
    };
    return responses[type] || `Resposta gerada (modo demo). ⚠️ Configure OPENAI_API_KEY para ativar a IA real.`;
  }
}

module.exports = new AIService();
