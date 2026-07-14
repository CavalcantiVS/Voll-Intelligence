const jwksClient = require('jwks-rsa');
const jwt = require('jsonwebtoken');

const TENANT_ID = process.env.AZURE_TENANT_ID;
const CLIENT_ID = process.env.AZURE_CLIENT_ID;
const ALLOWED_DOMAIN = process.env.AZURE_ALLOWED_DOMAIN || 'vollsolutions.com.br';

// Cliente que busca as chaves de assinatura públicas da Microsoft
const client = jwksClient({
  jwksUri: `https://login.microsoftonline.com/${TENANT_ID}/discovery/v2.0/keys`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000, // 10 minutes
});

function getSigningKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) return callback(err);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

// Valida um token de access/id emitido pela Microsoft e retorna o payload decodificado
const validateMicrosoftToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getSigningKey,
      {
        audience: CLIENT_ID,
        issuer: [
          `https://login.microsoftonline.com/${TENANT_ID}/v2.0`,
          `https://sts.windows.net/${TENANT_ID}/`,
        ],
        algorithms: ['RS256'],
      },
      (err, decoded) => {
        if (err) return reject(err);

        // Aplica restrição de domínio
        const email = decoded.preferred_username || decoded.upn || decoded.email || '';
        const domain = email.split('@')[1] || '';
        if (domain.toLowerCase() !== ALLOWED_DOMAIN.toLowerCase()) {
          return reject(new Error(`Acesso restrito a contas @${ALLOWED_DOMAIN}`));
        }

        resolve(decoded);
      }
    );
  });
};

module.exports = { validateMicrosoftToken };
