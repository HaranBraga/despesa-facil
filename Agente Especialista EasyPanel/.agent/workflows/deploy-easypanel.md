---
description: Deploy completo no EasyPanel. Gera Docker Compose, Dockerfiles, Nginx config e instrui o deploy.
---

# /deploy-easypanel - Deploy no EasyPanel

$ARGUMENTS

---

## Propósito

Este comando prepara e orienta o deploy completo de uma aplicação no EasyPanel.

---

## Sub-comandos

```
/deploy-easypanel          - Wizard interativo de deploy
/deploy-easypanel check    - Apenas checa se o projeto está pronto
/deploy-easypanel generate - Gera os arquivos Docker/Nginx/Compose
/deploy-easypanel guide    - Mostra o passo-a-passo do EasyPanel
```

---

## Fluxo

```
┌──────────────────────┐
│  /deploy-easypanel   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  1. VERIFICAR        │
│  Estrutura do projeto│
│  Backend funciona?   │
│  Frontend builda?    │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  2. GERAR ARQUIVOS   │
│  Dockerfile backend  │
│  Dockerfile frontend │
│  nginx.conf          │
│  docker-compose.prod │
│  .env.example        │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  3. VALIDAR BUILD    │
│  docker compose build│
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  4. INSTRUIR DEPLOY  │
│  Passo-a-passo       │
│  no painel EasyPanel │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│  5. CHECKLIST PÓS    │
│  Verificar domínio   │
│  Verificar /api      │
│  Verificar logs      │
└──────────────────────┘
```

---

## Checklist Pré-Deploy

```markdown
## 🚀 Checklist Pré-Deploy EasyPanel

### Backend
- [ ] `node src/server.js` inicia sem erros
- [ ] `GET /health` retorna 200
- [ ] Todas as rotas `/api/` funcionam
- [ ] Variáveis de ambiente documentadas

### Frontend
- [ ] `npm run build` (se Vite) sem erros
- [ ] Páginas carregam corretamente
- [ ] Chamadas à API usam caminho relativo `/api/`

### Docker
- [ ] `Dockerfile.prod` existe no backend
- [ ] `Dockerfile.prod` existe no frontend
- [ ] `nginx.conf` com proxy para `/api/`
- [ ] `docker-compose.prod.yml` na raiz
- [ ] `docker compose -f docker-compose.prod.yml build` passa

### Segurança
- [ ] JWT_SECRET é forte (mín. 32 chars)
- [ ] DATABASE_URL não está hardcoded
- [ ] `.env` no `.gitignore`
- [ ] CORS configurado

### Pronto para deploy? (s/n)
```

---

## Saída — Deploy Bem-Sucedido

```markdown
## 🚀 Deploy EasyPanel Completo

### Resumo
- **Projeto:** nome-do-projeto
- **Método:** Docker Compose
- **Serviços:** backend + frontend (Nginx)

### Arquivos Gerados
- ✅ `backend/Dockerfile.prod`
- ✅ `frontend/Dockerfile.prod`
- ✅ `frontend/nginx.conf`
- ✅ `docker-compose.prod.yml`
- ✅ `.env.example`

### Próximos Passos no EasyPanel
1. Criar projeto → Create Service → App
2. Source → Docker Compose → Colar conteúdo
3. Substituir variáveis de ambiente
4. Save → Deploy
5. Domains → Criar rota porta 80

### Checklist Pós-Deploy
- [ ] Frontend acessível pelo domínio
- [ ] `/api/health` respondendo 200
- [ ] Login funcionando
- [ ] Logs limpos no EasyPanel
```

---

## Exemplos

```
/deploy-easypanel
/deploy-easypanel check
/deploy-easypanel generate
/deploy-easypanel guide
```
