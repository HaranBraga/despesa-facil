# 🚀 Agente Especialista EasyPanel

Agente AI especializado em **criar sistemas full-stack** e **fazer deploy no EasyPanel**.

Combina expertise de Frontend, Backend, Banco de Dados e DevOps em um único agente,
com conhecimento real extraído de projetos em produção no EasyPanel.

---

## ⚡ Quick Start

### Comandos Disponíveis

| Comando | O que faz |
|---------|-----------|
| `/create-app` | Criar app do zero, pronta para EasyPanel |
| `/deploy-easypanel` | Gerar Dockerfiles/Compose e instruir deploy |
| `/debug` | Debug de problemas |

### Stack Padrão

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/CSS/JS + Vite |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL |
| Proxy | Nginx (reverse proxy) |
| Container | Docker + Docker Compose |
| Deploy | EasyPanel |

---

## 🧠 O que o Agente Sabe Fazer

- ✅ Criar sistemas CRUD completos (gestão, e-commerce, dashboards)
- ✅ Frontend responsivo com design premium
- ✅ API REST com autenticação JWT
- ✅ Schema PostgreSQL com migrations e seeds
- ✅ Docker multi-stage build otimizado
- ✅ Nginx como proxy reverso (`/api/` → backend)
- ✅ Docker Compose pronto para EasyPanel
- ✅ Troubleshooting de proxy, CORS, 404

---

## 📁 Estrutura

```
.agent/
├── agents/easypanel-fullstack.md   ← Agente principal
├── skills/
│   ├── easypanel-deploy/           ← ★ Deploy EasyPanel (com templates)
│   ├── api-patterns/               ← REST patterns
│   ├── app-builder/                ← Scaffolding de apps
│   ├── architecture/               ← Design de sistemas
│   ├── clean-code/                 ← Código limpo
│   ├── database-design/            ← PostgreSQL
│   ├── deployment-procedures/      ← Deploy seguro
│   ├── frontend-design/            ← UI/UX
│   ├── nodejs-best-practices/      ← Node.js
│   ├── systematic-debugging/       ← Debugging
│   ├── web-design-guidelines/      ← Design web
│   └── powershell-windows/         ← Windows
├── workflows/
│   ├── create-app.md               ← /create-app
│   ├── deploy-easypanel.md         ← /deploy-easypanel
│   └── debug.md                    ← /debug
└── rules/GEMINI.md                 ← Regras globais
```

---

## 🎯 Projetos de Referência

Este agente foi treinado com base em projetos reais:

- **Despesa Fácil** — Gestão de despesas (Vite + Express + PostgreSQL)
- **ClassPro** — Classificação NCM (HTML/CSS/JS + Express + PostgreSQL)

Ambos rodam em produção no EasyPanel via Docker Compose.

---

## 📋 Como Usar

1. Abra este workspace no seu editor (Cursor, VS Code, etc.)
2. O agente será carregado automaticamente via `.agent/`
3. Use os comandos `/create-app` ou `/deploy-easypanel`
4. Ou simplesmente descreva o que precisa em linguagem natural

---

> **Lema:** _"Todo sistema meu já nasce com Docker, Nginx e docker-compose.prod.yml. Pronto pro EasyPanel."_
