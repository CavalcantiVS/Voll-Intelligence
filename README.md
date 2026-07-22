# 🧠 Voll Intelligence

Portal corporativo para uso seguro e colaborativo de Inteligência Artificial dentro da empresa.

## 🎯 Objetivo
Evitar que colaboradores utilizem ferramentas como ChatGPT de forma insegura, expondo dados sensíveis da empresa ou de clientes. O projeto garante que o uso de IA seja **controlado, seguro e monitorado**.

## 💡 A Solução e Evolução
O que começou como um portal interno básico evoluiu para o **Voll AI Portal**, uma plataforma moderna e completa. Agora o sistema conta com:
- O uso de IA controlado e protegido;
- Interações monitoradas e logs de auditoria;
- Ambientes de colaboração em equipe.

## 🚀 Funcionalidades Atuais

Passamos com sucesso da fase de MVP! O sistema agora conta com as seguintes funcionalidades ativas:

- [x] **Login e Segurança:** Autenticação robusta (JWT) com integração **SSO via Microsoft Entra ID (Azure)**.
- [x] **Interface de Chat com IA:** Área individual com suporte a Markdown, tabelas, código e histórico completo.
- [x] **Espaço Colaborativo (TeamChat):** Ambientes separados por equipes e canais para colaboração integrada.
- [x] **Controle de Acessos (RBAC):** Níveis de permissão rigorosos (Administrador Geral, Admin de Equipe, Membro comum).
- [x] **Registro de Conversas e Dashboards:** Logs mantidos no PostgreSQL e painéis interativos (via Recharts) para gestão.
- [x] **Avisos de Segurança:** Sistema automático de detecção de vazamento de dados sensíveis nas mensagens.
- [x] **Design Premium:** Interface 100% repaginada utilizando **Glassmorphism**, contrastes profundos, *Dark Mode* integrado e arquitetura modular de CSS.

## 🛠️ Tecnologias Utilizadas

### Frontend (Voll AI Portal)
* **React** + **Vite**
* **CSS Modules** (Estilização modular e imersiva)
* **Lucide React** (Ícones) e **Recharts** (Gráficos)
* **Socket.io-client** (Tempo real)

### Backend
* **Node.js** + **Express**
* **PostgreSQL** (Banco de dados relacional via `pg`)
* **Socket.io** (WebSockets para chat)

## ⚙️ Estrutura do Repositório

- `/Voll AI Portal`: Contém toda a aplicação principal (Frontend em React e Backend em Node.js).
- `/Voll Desk`: (Outros serviços do ecossistema Voll).

---
*Criado por João Victor de Souza Cavalcanti.*
*Desenvolvido em parceria com Antigravity.*
