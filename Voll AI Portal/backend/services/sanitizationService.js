/**
 * Service to sanitize prompts, masking sensitive information 
 * like emails, phones, CPFs, CNPJs, etc.
 */
class SanitizationService {
  sanitize(text) {
    if (!text) return text;
    
    let sanitized = text;
    
    // Emails
    sanitized = sanitized.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[DADO_REMOVIDO]');
    
    // Phones (Telefone can also be a Pix key)
    sanitized = sanitized.replace(/(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))/g, '[DADO_REMOVIDO]');
    
    // CPF
    sanitized = sanitized.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[DADO_REMOVIDO]');
    
    // CNPJ
    sanitized = sanitized.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[DADO_REMOVIDO]');
    
    // Chaves Pix (UUID format)
    sanitized = sanitized.replace(/\b[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}\b/g, '[DADO_REMOVIDO]');

    // Tokens/Senhas
    sanitized = sanitized.replace(/(?:senha|password|token|bearer)[\s:=]+([^\s,;]+)/gi, 'senha: [DADO_REMOVIDO]');
    
    return sanitized;
  }
}

module.exports = new SanitizationService();
