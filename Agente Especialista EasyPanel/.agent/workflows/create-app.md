---
description: Criar aplicação do zero pronta para EasyPanel. Frontend + Backend + Docker Compose.
---

# /create-app - Criar Aplicação

$ARGUMENTS

---

## Propósito

Este comando cria uma aplicação full-stack do zero, já preparada para deploy no EasyPanel.

---

## Sub-comandos

```
/create-app                    - Wizard interativo
/create-app <descrição>        - Criar app baseado na descrição
```

---

## Passos

### 1. Análise do Pedido
- Entender o que o usuário quer
- Se faltam informações, perguntar:
  - Que tipo de sistema?
  - Quais funcionalidades principais?
  - Precisa de autenticação?
  - Quem vai usar?

### 2. Planejamento
- Definir entidades do banco (tabelas, colunas, relações)
- Definir endpoints da API
- Definir páginas do frontend
- Definir estrutura de pastas

### 3. Construção (Camada por camada)

```
┌─────────────────────────────┐
│  1. DATABASE                │
│  Schema SQL, migrations     │
├─────────────────────────────┤
│  2. BACKEND                 │
│  Express server, rotas,     │
│  auth, validação            │
├─────────────────────────────┤
│  3. FRONTEND                │
│  HTML/CSS/JS, chamadas API  │
│  Design premium             │
├─────────────────────────────┤
│  4. DOCKER                  │
│  Dockerfiles, nginx.conf,   │
│  docker-compose.prod.yml    │
├─────────────────────────────┤
│  5. DOCS                    │
│  README, .env.example,      │
│  DEPLOY_EASYPANEL.md        │
└─────────────────────────────┘
```

### 4. Verificação
- Backend inicia sem erros
- Frontend builda sem erros
- Docker compose build passa
- Endpoints protegidos exigem JWT

### 5. Entrega
- Apresentar estrutura final
- Instruções de dev local
- Instruções de deploy no EasyPanel

---

## Estrutura Padrão Gerada

```
projeto/
├── backend/
│   ├── src/
│   │   ├── server.js
│   │   ├── routes/
│   │   ├── controllers/
│   │   ├── middleware/
│   │   │   └── auth.js
│   │   └── db/
│   │       ├── migrate.js
│   │       └── seed.js
│   ├── Dockerfile.prod
│   ├── package.json
│   └── .dockerignore
├── frontend/
│   ├── src/ (ou raiz se estático)
│   ├── index.html
│   ├── nginx.conf
│   ├── Dockerfile.prod
│   └── package.json (se Vite)
├── docker-compose.yml          # Dev local
├── docker-compose.prod.yml     # Produção (EasyPanel)
├── .env.example
├── .gitignore
└── README.md
```

---

## Stack Padrão

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/CSS/JS + Vite |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL |
| Proxy | Nginx Alpine |
| Container | Docker Compose |
| Deploy | EasyPanel |

---

## Exemplos

```
/create-app sistema de gestão de estoque
/create-app blog com login e painel admin
/create-app plataforma de cursos online
/create-app e-commerce com carrinho e pagamento
/create-app dashboard financeiro com gráficos
```
