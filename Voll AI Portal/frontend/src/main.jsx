import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication, EventType } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import { msalConfig } from './authConfig'
import './index.css'
import App from './App.jsx'

// Inicializa o cliente MSAL de forma assíncrona (obrigatório no MSAL v3+)
const msalInstance = new PublicClientApplication(msalConfig)

// Garante que o MSAL esteja pronto e processe qualquer redirect/hash pendente
msalInstance.initialize().then(() => {
  return msalInstance.handleRedirectPromise();
}).then((response) => {
  // Se `response` existir, significa que acabamos de voltar do login da Microsoft com sucesso!
  if (response && response.account) {
    msalInstance.setActiveAccount(response.account);
  } else {
    // Se não, tenta recuperar a conta ativa da sessão (se houver)
    const accounts = msalInstance.getAllAccounts();
    if (accounts.length > 0) {
      msalInstance.setActiveAccount(accounts[0]);
    }
  }

  // Quando o login completar via popup, define a conta ativa
  msalInstance.addEventCallback((event) => {
    if (
      event.eventType === EventType.LOGIN_SUCCESS ||
      event.eventType === EventType.ACQUIRE_TOKEN_SUCCESS
    ) {
      const account = event.payload?.account
      if (account) {
        msalInstance.setActiveAccount(account)
      }
    }
  })

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <App />
      </MsalProvider>
    </StrictMode>,
  )
})
