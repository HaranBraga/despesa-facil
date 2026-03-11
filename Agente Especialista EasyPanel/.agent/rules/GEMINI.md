---
name: rules
description: Regras globais do Agente Especialista EasyPanel. Define stack padrão, idioma, e convenções de projeto.
---

# Regras Globais — Agente Especialista EasyPanel

## Idioma
- Toda comunicação em **Português Brasileiro (PT-BR)**
- Nomes de variáveis e código em **inglês**
- Comentários de código em **português**

## Stack Padrão

Quando o usuário não especificar a tecnologia, usar:

| Camada | Tecnologia |
|--------|-----------|
| Frontend | HTML/CSS/JS + Vite |
| Backend | Node.js 20 + Express |
| Database | PostgreSQL |
| Auth | JWT + bcryptjs |
| Validação | express-validator |
| Proxy | Nginx Alpine |
| Container | Docker + Docker Compose |
| Deploy | EasyPanel (Docker Compose mode) |

## Convenções de Projeto

### Estrutura de Pastas
```
projeto/
├── backend/
│   ├── src/
│   │   ├── server.js          # Entry point
│   │   ├── routes/            # Definição de rotas
│   │   ├── controllers/       # Lógica de negócio
│   │   ├── middleware/        # Auth, validação, errors
│   │   └── db/                # Migrations, seeds, pool
│   ├── Dockerfile.prod
│   └── package.json
├── frontend/
│   ├── src/ (ou raiz)
│   ├── index.html
│   ├── nginx.conf
│   ├── Dockerfile.prod
│   └── package.json
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env
├── .env.example
├── .gitignore
└── README.md
```

### Naming Conventions
- **Arquivos**: kebab-case (`user-routes.js`, `auth-middleware.js`)
- **Variáveis/Funções**: camelCase (`getUserById`, `isAuthenticated`)
- **Constantes**: UPPER_SNAKE_CASE (`JWT_SECRET`, `DATABASE_URL`)
- **Tabelas SQL**: snake_case plural (`users`, `expense_categories`)
- **Colunas SQL**: snake_case (`created_at`, `user_id`)

### Segurança — OBRIGATÓRIO
- [ ] Jamais hardcodar secrets (JWT_SECRET, DATABASE_URL)
- [ ] Sempre usar variáveis de ambiente
- [ ] Sempre validar inputs no backend
- [ ] Sempre hashear senhas com bcryptjs
- [ ] Sempre verificar JWT em rotas protegidas
- [ ] Sempre configurar CORS
- [ ] Sempre ter `.env` no `.gitignore`

### Docker — OBRIGATÓRIO
- [ ] Todo projeto deve ter `docker-compose.prod.yml`
- [ ] Todo backend deve ter `Dockerfile.prod`
- [ ] Todo frontend deve ter `Dockerfile.prod`
- [ ] Todo frontend deve ter `nginx.conf` com proxy para `/api/`
- [ ] Todo backend deve ter endpoint `GET /health`

### Frontend — Padrões
- Design moderno e premium (não genérico)
- Mobile-first responsive
- Google Fonts (Inter, Roboto, Outfit)
- CSS custom properties para tema
- Micro-animações e hover effects
- Sem jQuery — vanilla JS ou Vite

### Backend — Padrões
- Arquitetura: `routes → controllers → services → DB`
- Error handling centralizado
- Logging sem dados sensíveis
- Responses consistentes: `{ success, data, message }`
- Status codes HTTP corretos

### Database — Padrões
- Sempre usar constraints (NOT NULL, UNIQUE, FK)
- Sempre uuid ou SERIAL para PKs
- Sempre `created_at`, `updated_at` com DEFAULT
- Migrations em `backend/src/db/migrate.js`
- Seeds em `backend/src/db/seed.js`

## Qualidade

Após cada alteração:
1. Backend funciona? (`node src/server.js`)
2. Frontend builda? (`npm run build`)
3. Docker builda? (`docker compose -f docker-compose.prod.yml build`)
4. Sem secrets expostos?
5. Documentação atualizada?
