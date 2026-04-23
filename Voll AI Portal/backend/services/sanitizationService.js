/**
 * Service to sanitize prompts, masking sensitive information 
 * like emails, phones, CPFs, CNPJs, etc.
 */
class SanitizationService {
  sanitize(text) {
    if (!text) return text;
    
    let sanitized = text;
    
    // Replace emails: user@example.com
    sanitized = sanitized.replace(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi, '[EMAIL]');
    
    // Replace phones
    sanitized = sanitized.replace(/(?:(?:\+|00)?(55)\s?)?(?:\(?([1-9][0-9])\)?\s?)?(?:((?:9\d|[2-9])\d{3})\-?(\d{4}))/g, '[TELEFONE]');
    
    // Replace CPF: xxx.xxx.xxx-xx
    sanitized = sanitized.replace(/\b\d{3}\.\d{3}\.\d{3}-\d{2}\b/g, '[CPF]');
    
    // Replace CNPJ: xx.xxx.xxx/xxxx-xx
    sanitized = sanitized.replace(/\b\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}\b/g, '[CNPJ]');
    
    return sanitized;
  }
}

module.exports = new SanitizationService();
