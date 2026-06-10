// Configuração do Microsoft Authentication Library (MSAL) v5
// Documentação: https://learn.microsoft.com/en-us/entra/identity-platform/msal-js-initializing-client-applications

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: `https://login.microsoftonline.com/${import.meta.env.VITE_AZURE_TENANT_ID}`,
    redirectUri: window.location.origin,
    postLogoutRedirectUri: window.location.origin,
    navigateToLoginRequestUrl: false,
  },
  cache: {
    cacheLocation: 'sessionStorage',           // Mais seguro que localStorage
    storeAuthStateInCookie: false,
    secureCookies: false,
  },
  system: {
    allowNativeBroker: false,                  // Desabilita broker nativo (evita loops no Edge)
    loggerOptions: {
      logLevel: 3,                             // Warning
      loggerCallback: (level, message, containsPii) => {
        if (containsPii) return;
        if (import.meta.env.DEV && level === 0) {
          console.error('[MSAL Error]', message);
        }
      },
      piiLoggingEnabled: false,
    }
  }
};

// Escopos de permissão solicitados ao Microsoft
export const loginRequest = {
  scopes: ['User.Read', 'openid', 'profile', 'email'],
};

// Escopos para foto de perfil (Microsoft Graph)
export const graphRequest = {
  scopes: ['User.Read'],
  endpoint: 'https://graph.microsoft.com/v1.0/me',
};
