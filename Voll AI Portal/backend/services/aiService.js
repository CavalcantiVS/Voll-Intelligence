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
  async generateResponse(sanitizedPrompt, type, options = {}) {
    const systemPrompt = this._getSystemPrompt(type);
    const model = options.model || (this.useGemini ? this.geminiModel : this.model || 'gpt-4o');
    const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : 0.7;
    
    const isGeminiModel = model && model.toLowerCase().includes('gemini');

    if (isGeminiModel && (this.useGemini || process.env.GEMINI_API_KEY)) {
      if (!this.genAI && process.env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }
      return this._callGemini([], sanitizedPrompt, systemPrompt, model, temperature);
    } else if (!isGeminiModel && (this.useOpenAI || process.env.OPENAI_API_KEY)) {
      if (!this.client && process.env.OPENAI_API_KEY) {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }
      return this._callOpenAI([
        { role: 'system', content: systemPrompt },
        { role: 'user', content: sanitizedPrompt }
      ], model, temperature);
    }

    return this._mockResponse(type, sanitizedPrompt, model, temperature);
  }

  /**
   * Generate a chat response
   */
  async generateChatResponse(history, newPrompt, options = {}) {
    const systemMessageContent = `Você é o Voll AI, um assistente corporativo interno da Voll Solutions.`;
    const model = options.model || (this.useGemini ? this.geminiModel : this.model || 'gpt-4o');
    const temperature = options.temperature !== undefined ? parseFloat(options.temperature) : 0.7;

    const isGeminiModel = model && model.toLowerCase().includes('gemini');

    // Build the user message content
    let userContent = newPrompt;
    let geminiParts = [{ text: newPrompt }];

    if (options.attachment) {
      if (options.attachment.text) {
        userContent = `[Conteúdo extraído do arquivo anexado "${options.attachment.fileName}":\n${options.attachment.text}]\n\nPergunta/Instrução do usuário: ${newPrompt}`;
        geminiParts[0].text = userContent;
      } else if (options.attachment.base64) {
        // OpenAI format
        userContent = [
          { type: 'text', text: newPrompt },
          { type: 'image_url', image_url: { url: `data:${options.attachment.mimeType};base64,${options.attachment.base64}` } }
        ];
        // Gemini format
        geminiParts = [
          { text: newPrompt },
          { inlineData: { data: options.attachment.base64, mimeType: options.attachment.mimeType } }
        ];
      }
    }

    if (isGeminiModel && (this.useGemini || process.env.GEMINI_API_KEY)) {
      if (!this.genAI && process.env.GEMINI_API_KEY) {
        this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      }
      return this._callGemini(history, geminiParts, systemMessageContent, model, temperature);
    } else if (!isGeminiModel && (this.useOpenAI || process.env.OPENAI_API_KEY)) {
      if (!this.client && process.env.OPENAI_API_KEY) {
        this.client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
      }
      const systemMessage = {
        role: 'system',
        content: systemMessageContent
      };
      return this._callOpenAI([systemMessage, ...history, { role: 'user', content: userContent }], model, temperature);
    }
    
    // Mock response if no keys
    return this._mockResponse('Chat', newPrompt, model, temperature);
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

  async _callOpenAI(messages, model = this.model, temperature = 0.7) {
    try {
      const completion = await this.client.chat.completions.create({
        model: model || 'gpt-4o',
        messages,
        max_tokens: 1000,
        temperature: parseFloat(temperature),
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

  async _callGemini(history, newPrompt, systemInstruction, model = this.geminiModel, temperature = 0.7) {
    try {
      const geminiModelConfig = {
        model: model || 'gemini-1.5-flash',
        ...(systemInstruction && { systemInstruction }),
        generationConfig: {
          temperature: parseFloat(temperature)
        }
      };
      
      const genModel = this.genAI.getGenerativeModel(geminiModelConfig);
      
      // Convert standard history to Gemini history format
      const formattedHistory = history.map(m => ({
        role: m.role === 'user' ? 'user' : 'model',
        parts: [{ text: m.content }]
      }));
      
      const chat = genModel.startChat({ history: formattedHistory });
      const result = await chat.sendMessage(Array.isArray(newPrompt) ? newPrompt : [{ text: newPrompt }]);
      
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