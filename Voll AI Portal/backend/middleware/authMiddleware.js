const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'voll_super_secret_jwt_key_2024_production_safe';

// ── Middleware: valida JWT emitido pelo próprio backend Voll ──────
const requireAuth = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
};

// ── Middleware: exige papel de Administrador Geral ────────────────
const requireAdmin = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'Administrador Geral') {
      return res.status(403).json({ error: 'Acesso restrito a Administrador Geral' });
    }

    req.userId = decoded.id;
    req.adminId = decoded.id;
    req.userRole = decoded.role;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Sessão inválida ou expirada. Faça login novamente.' });
  }
};

module.exports = { requireAuth, requireAdmin, JWT_SECRET };
