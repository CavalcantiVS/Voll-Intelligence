const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');

/**
 * Service to handle communication with Google Gemini or OpenAI APIs
 * Falls back to mock responses if API keys are not configured
 */
class AIService {
  constructor() {
    this.useGemini = !!process.env.GEMINI_API_KEY;
    this.useOpenAI = !!process.env.OPENAI_API_KEY;

    if (this.useGemini) {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.geminiModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
      console.log(`[AIService] Using Google Gemini API (model: ${this.geminiModel})`);
    } else if (this.useOpenAI) {
      this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      this.model = process.env.OPENAI_MODEL || 'gpt-4o';
      console.log(`[AIService] Using real OpenAI API (model: ${this.model})`);
    } else {
      console.warn('[AIService] No API Key set — running in mock mode');
    }
  }

  /**
   * Generate a response for tool prompts
   */
  async generateResponse(sanitizedPrompt, type) {
    const systemPrompt = this._getSystemPrompt(type);
    
    if (this.useGemini) {
      return this._callGemini([], sanitizedPrompt, systemPrompt);
    } else if (this.useOpenAI) {
      return this._callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitizedPrompt }
      ]);
    }

    return this._mockResponse(type, sanitizedPrompt);
  }

  /**
   * Generate a chat response
   */
  async generateChatResponse(history, newPrompt) {
    const systemMessageContent = `Você é o Voll AI, um assistente corporativo interno da Voll Solutions.`;

    if (this.useGemini) {
      return this._callGemini(history, newPrompt, systemMessageContent);
    } else if (this.useOpenAI) {
      const systemMessage = {
        role: 'system',
        content: systemMessageContent
      };
      return this._callOpenAI([systemMessage, ...history, { role: 'user', content: newPrompt }]);
    }
    
    // Mock response if no keys
    return this._mockResponse('Chat', newPrompt);
  }

  /**
   * Mensagem padrão de desenvolvimento
   */
  _developmentMessage(messages) {
    const lastMessage = messages[messages.length - 1]?.content || '';

    return `🚧 Voll AI em desenvolvimento

📩 Mensagem recebida:
"${lastMessage}"

🧠 Interpretação:
Entendi que você está buscando ajuda relacionada a "${lastMessage.slice(0, 30)}..."

⚙️ Status:
Essa funcionalidade ainda está sendo construída.

💡 Em breve você poderá:
- Gerar respostas inteligentes
- Criar automações
- Integrar com sistemas

Obrigado pela paciência 🙏`;
  }

  async _callOpenAI(messages) {
    try {
      const completion = await this.client.chat.completions.create({
        model: this.model,
        messages,
        max_tokens: 1000,
        temperature: 0.7,
      });

      return completion.choices[0].message.content;

    } catch (error) {
      console.error('[OpenAI ERROR]', error);

      return `⚠️ Erro ao gerar resposta da IA.

Possíveis causas:
- API Key inválida
- Limite de uso atingido
- Problema de conexão

Verifique com o time de desenvolvimento.`;
    }
  }

  async _callGemini(history, newPrompt, systemInstruction) {
    try {
      const geminiModelConfig = {
        model: this.geminiModel,
        ...(systemInstruction && { systemInstruction })
      };
      
      const genModel = this.genAI.getGenerativeModel(geminiModelConfig);
      
      // Convert standard history to Gemini history format
      const formattedHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const chat = genModel.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(newPrompt);
      
      return result.response.text();
    } catch (error) {
      console.error('[Gemini ERROR]', error);
      return `⚠️ Erro ao gerar resposta da IA com Gemini.`;
    }
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