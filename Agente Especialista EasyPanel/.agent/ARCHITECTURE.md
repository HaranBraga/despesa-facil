# Agente Especialista EasyPanel — Arquitetura

> Agente AI especializado em criar sistemas full-stack e fazer deploy no EasyPanel.

---

## 📋 Visão Geral

Este agente foi construído a partir dos melhores componentes do **Antigravity Kit**, combinados com conhecimento real extraído de projetos que rodam em produção no EasyPanel:

- **Despesa Fácil** — Sistema de gerenciamento de despesas (Vite + Express + PostgreSQL)
- **ClassPro** — Sistema de classificação NCM (HTML/CSS/JS + Express + PostgreSQL)

---

## 🏗️ Estrutura

```plaintext
.agent/
├── ARCHITECTURE.md              # Este arquivo
├── agents/
│   └── easypanel-fullstack.md   # Agente principal (unificado)
├── skills/
│   ├── easypanel-deploy/        # ★ Skill EasyPanel (novo)
│   │   ├── SKILL.md
│   │   └── templates/           # Templates Docker/Nginx/Compose
│   ├── api-patterns/            # REST patterns
│   ├── app-builder/             # Orquestração de criação de apps
│   ├── architecture/            # Design de sistemas
│   ├── clean-code/              # Padrões de código limpo
│   ├── database-design/         # Schema design PostgreSQL
│   ├── deployment-procedures/   # Princípios de deploy
│   ├── frontend-design/         # UI/UX patterns
│   ├── nodejs-best-practices/   # Best practices Node.js
│   ├── systematic-debugging/    # Debugging metódico
│   ├── web-design-guidelines/   # Audit de design web
│   └── powershell-windows/      # Comandos Windows
├── workflows/
│   ├── deploy-easypanel.md      # /deploy-easypanel
│   ├── create-app.md            # /create-app
│   └── debug.md                 # /debug
├── rules/
│   └── GEMINI.md                # Regras globais
└── scripts/
    └── verify_all.py            # Validação pré-deploy
```

---

## 🤖 Agente

| Agente | Foco | Skills |
|--------|------|--------|
| `easypanel-fullstack` | Full-stack + Deploy EasyPanel | Todos os skills abaixo |

---

## 🧩 Skills (12)

| Skill | Descrição | Origem |
|-------|-----------|--------|
| `easypanel-deploy` | Deploy no EasyPanel, Docker, Nginx, Compose | **Novo** |
| `api-patterns` | REST, Express, rotas, middleware | Kit |
| `app-builder` | Scaffolding de apps full-stack | Kit |
| `architecture` | Design de sistemas, padrões | Kit |
| `clean-code` | Código limpo, convenções | Kit |
| `database-design` | PostgreSQL, schema, otimização | Kit |
| `deployment-procedures` | Princípios de deploy seguro | Kit |
| `frontend-design` | UI/UX, responsividade | Kit |
| `nodejs-best-practices` | Async, módulos, performance | Kit |
| `systematic-debugging` | Troubleshooting metódico | Kit |
| `web-design-guidelines` | 100+ regras de design web | Kit |
| `powershell-windows` | Ambiente Windows | Kit |

---

## 🔄 Workflows (3)

| Comando | Descrição |
|---------|-----------|
| `/deploy-easypanel` | Deploy completo no EasyPanel |
| `/create-app` | Criar app do zero, pronta para EasyPanel |
| `/debug` | Debug de problemas |

---

## 🎯 Stack Padrão

| Camada | Tecnologia |
|--------|-----------|
| **Frontend** | HTML/CSS/JS + Vite (ou estático) |
| **Backend** | Node.js + Express |
| **Database** | PostgreSQL |
| **Proxy** | Nginx (reverse proxy /api/ → backend) |
| **Container** | Docker + Docker Compose |
| **Deploy** | EasyPanel (Docker Compose mode) |
