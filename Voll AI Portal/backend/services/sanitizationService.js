/**
 * Serviço para sanitizar prompts, mascarando informações sensíveis 
 * como e-mails, telefones, CPFs, CNPJs, etc.
 */
class SanitizationService {
  sanitize(text) {
    if (!text) return text;
    
    let sanitized = text;
    
    // E-mails
    sanitized = sanitized.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[DADO_REMOVIDO]');
    
    // Telefones (Telefone também pode ser uma chave Pix)
    sanitized = sanitized.replace(/(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))/g, '[DADO_REMOVIDO]');
    
    // CPF
    sanitized = sanitized.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[DADO_REMOVIDO]');
    
    // CNPJ
    sanitized = sanitized.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[DADO_REMOVIDO]');
    
    // Chaves Pix (formato UUID)
    sanitized = sanitized.replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '[DADO_REMOVIDO]');

    // Tokens/Senhas
    sanitized = sanitized.replace(/(?:senha|password|token|bearer)[\s:=]+([^\s,;]+)/gi, 'senha: [DADO_REMOVIDO]');
    
    return sanitized;
  }
}

module.exports = new SanitizationService();
