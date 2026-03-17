# 🚀 Agente Especialista EasyPanel

Agente AI especializado em **criar sistemas full-stack** e **fazer deploy no EasyPanel**.

Conhecimento real extraído de projetos em produção no EasyPanel.

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

## 📁 Estrutura

```
.agent/
├── agents/easypanel-fullstack.md   ← Agente principal
├── skills/
│   ├── easypanel-deploy/           ← Deploy EasyPanel (templates Docker/Nginx)
│   └── frontend-design/           ← UI/UX, psicologia, cores, tipografia
├── workflows/
│   ├── create-app.md               ← /create-app
│   ├── deploy-easypanel.md         ← /deploy-easypanel
│   └── debug.md                    ← /debug
└── rules/GEMINI.md                 ← Regras globais
```

---

## 📋 Como Usar

1. Abra este workspace no seu editor (Cursor, VS Code, etc.)
2. O agente será carregado automaticamente via `.agent/`
3. Use os comandos `/create-app` ou `/deploy-easypanel`
4. Ou simplesmente descreva o que precisa em linguagem natural

---

> **Lema:** _"Todo sistema meu já nasce com Docker, Nginx e docker-compose.prod.yml. Pronto pro EasyPanel."_
