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
   * Generate a response for tool prompts
   */
  async generateResponse(sanitizedPrompt, type) {
    if (this.useRealAI) {
      return this._callOpenAI([
        { role: 'system', content: this._getSystemPrompt(type) },
        { role: 'user', content: sanitizedPrompt }
      ]);
    }

    return this._mockResponse(type, sanitizedPrompt);
  }

  /**
   * Generate a chat response
   */
  async generateChatResponse(messages) {
    const systemMessage = {
      role: 'system',
      content: `Você é o Voll AI, um assistente corporativo interno da Voll Solutions.`
    };

    if (this.useRealAI) {
      return this._callOpenAI([systemMessage, ...messages]);
    }

    return this._developmentMessage(messages);
  }

  /**
   * Mensagem padrão de desenvolvimento
   */
  _developmentMessage(messages) {
    const lastMessage = messages[messages.length - 1]?.content || '';

    return `🚧 **Voll AI em desenvolvimento**

Recebi sua mensagem:

"${lastMessage}"

No momento, o assistente ainda está em fase de construção e não gera respostas automáticas.

💡 Em breve você poderá:
- Criar fluxos de chatbot
- Gerar respostas para clientes
- Automatizar processos internos

Obrigado pela paciência 🙏`;
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
      ChatbotFlow: 'Você é especialista em fluxos de chatbot.',
      ResponseGenerator: 'Você é especialista em atendimento ao cliente.',
      Automation: 'Você é especialista em automação.',
      Documentation: 'Você é especialista em documentação técnica.',
      TextRefinement: 'Você melhora textos corporativos.',
      PromptEngineering: 'Você cria prompts otimizados.',
    };

    return prompts[type] || 'Assistente corporativo da Voll.';
  }

  /**
   * Mock simples para ferramentas
   */
  _mockResponse(type, prompt) {
    if (type === 'ChatbotFlow') {
      return `🤖 Fluxo de chatbot (modo demo)`;
    }

    if (type === 'ResponseGenerator') {
      return `💬 Resposta ao cliente (modo demo)`;
    }

    if (type === 'Automation') {
      return `⚙️ Automação (modo demo)`;
    }

    return `🤖 Resposta simulada para: "${prompt}"`;
  }
}

module.exports = new AIService();