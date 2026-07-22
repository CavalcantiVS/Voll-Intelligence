# Voll AI Portal

Bem-vindo ao repositório do **Voll AI Portal**, uma plataforma moderna e avançada de Inteligência Artificial e atendimento corporativo desenvolvida para a Voll Intelligence.

## 🚀 Sobre o Projeto

O Voll AI Portal é uma solução completa que centraliza assistentes virtuais, criação de fluxos de atendimento, gestão de prompts e trabalho colaborativo em equipe (TeamChat). O projeto foi desenhado com um foco especial na experiência do usuário, utilizando um design visual de ponta baseado em **Glassmorphism**, contrastes profundos em Dark Mode e interações fluidas.

## 🛠️ Tecnologias Utilizadas

### Frontend
* **React** + **Vite**
* **CSS Modules** (Arquitetura CSS robusta sem vazamento de escopo)
* **Recharts** (Dashboards e Gráficos de Uso)
* **Lucide React** (Ícones SVG)
* **Socket.io-client** (Comunicação em tempo real)

### Backend
* **Node.js** + **Express**
* **PostgreSQL** (Banco de dados relacional via `pg`)
* **Socket.io** (WebSockets)
* **JWT** (Autenticação) e **Microsoft Entra ID / Azure** (Integração SSO)

## ✨ Principais Funcionalidades

* **Chat AI Individual:** Interface imersiva para interação com a Voll AI, incluindo formatação markdown e histórico de sessões.
* **Espaço Colaborativo (TeamChat):** Área de chat focada no trabalho em equipe com separação por canais, e controle restrito de permissões (onde apenas admins gerenciam membros).
* **Dashboard Interativo:** Painel de controle para acompanhamento de estatísticas e uso (com integração do Recharts).
* **Gestão de Roles:** Controle de acessos robusto (Administrador Geral, Administrador, Membro).
* **Temas Claro e Escuro:** Suporte dinâmico a Dark Mode totalmente implementado.
* **Layout Responsivo e Modular:** Barra lateral retrátil para manter a imersão na área de trabalho da equipe.

## ⚙️ Como Executar o Projeto Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/en/) (v16 ou superior)
* [PostgreSQL](https://www.postgresql.org/) (Configurado e rodando na sua máquina ou em nuvem)

### Passo 1: Configurando o Backend
1. Navegue até a pasta do backend:
   ```bash
   cd backend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Configure o arquivo `.env` (crie-o caso não exista) com as credenciais do banco de dados e as chaves JWT/SSO.
4. Execute o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

### Passo 2: Configurando o Frontend
1. Abra um novo terminal e navegue até a pasta do frontend:
   ```bash
   cd frontend
   ```
2. Instale as dependências:
   ```bash
   npm install
   ```
3. Inicie o servidor frontend:
   ```bash
   npm run dev
   ```
4. O portal estará acessível em `http://localhost:5173`.

## 🎨 Arquitetura de Estilos

Durante a evolução do projeto, os estilos globais (`index.css`) foram reestruturados para utilizar **CSS Modules** (ex: `Chat.module.css`, `TeamChat.module.css`, `Layout.module.css`). Isso garante manutenibilidade e evita conflitos, mantendo a identidade visual premium com painéis de fundo de vidro, gradientes suaves e microanimações.

---
*Desenvolvido em parceria com Antigravity*
