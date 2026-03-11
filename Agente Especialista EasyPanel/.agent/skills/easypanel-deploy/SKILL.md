---
name: easypanel-deploy
description: Guia completo de deploy no EasyPanel usando Docker Compose. Inclui templates de Dockerfile, nginx.conf, docker-compose.prod.yml, troubleshooting de proxy/CORS/404, e checklists de produção. Baseado em projetos reais rodando em EasyPanel.
allowed-tools: Read, Write, Edit, Glob, Grep, Bash
---

# EasyPanel Deploy — Skill Completo

> Deploy de aplicações full-stack no EasyPanel usando Docker Compose.
> Baseado em projetos reais: **Despesa Fácil** e **ClassPro**.

---

## 📁 Templates Disponíveis

| Template | Arquivo | Quando Usar |
|----------|---------|-------------|
| Docker Compose produção | `templates/docker-compose.prod.yml` | Sempre |
| Dockerfile Backend Node.js | `templates/backend.Dockerfile` | Backend Express/Node |
| Dockerfile Frontend Vite | `templates/frontend-vite.Dockerfile` | Frontend com build step |
| Dockerfile Frontend Estático | `templates/frontend-static.Dockerfile` | HTML/CSS/JS puro |
| Nginx config | `templates/nginx.conf` | Sempre (proxy reverso) |

**⚠️ Leia SOMENTE o template necessário para o caso.**

---

## 🚀 Fluxo de Deploy no EasyPanel

### Método 1: Docker Compose (RECOMENDADO)

O EasyPanel suporta apps via Docker Compose. O Backend, Frontend e (opcionalmente) o BD rodam no mesmo projeto isolado mas conectado.

#### Passo a Passo

1. **Preparar o projeto** (estrutura mínima):
   ```
   meu-projeto/
   ├── backend/
   │   ├── Dockerfile.prod
   │   ├── package.json
   │   └── src/server.js
   ├── frontend/
   │   ├── Dockerfile.prod
   │   ├── nginx.conf
   │   └── (arquivos do frontend)
   ├── docker-compose.prod.yml
   ├── .env.example
   └── .gitignore
   ```

2. **Testar build local**:
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```

3. **No EasyPanel**:
   - Projetos → Criar Novo → **Create Service** → **App**
   - Nome: `nome-do-projeto`
   - Aba **Source** → Selecionar **Docker Compose**
   - Colar conteúdo do `docker-compose.prod.yml`
   - Substituir variáveis sensíveis (`${JWT_SECRET}`, etc.)
   - **Save** → **Deploy**

4. **Configurar domínio**:
   - Aba **Domains** → Criar rota
   - Apontar para porta `80` (Nginx do frontend)
   - O Nginx redireciona `/api/` para o backend interno

5. **Verificar**:
   - Acessar domínio → Frontend carregando
   - Acessar `dominio.com/api/health` → 200 OK
   - Checar logs no EasyPanel

---

### Método 2: Serviços Separados

Para análise de log individual de cada componente:

1. **Banco de Dados**:
   - Create Service → **PostgreSQL**
   - Credenciais: DB Name, User, Password

2. **Backend API**:
   - Create Service → **App** → Nome: `projeto-api`
   - Source: GitHub ou Docker Image
   - Build Path: `backend/`, Dockerfile: `Dockerfile.prod`
   - Environment: `DATABASE_URL`, `JWT_SECRET`, `PORT=3000`
   - Domains: porta 3000 (se API pública)

3. **Frontend**:
   - Create Service → **App** → Nome: `projeto-web`
   - Build Path: `frontend/`, Dockerfile: `Dockerfile.prod`
   - Domains: porta 80

> ⚠️ No Método 2, o `proxy_pass` no `nginx.conf` deve apontar para o nome do serviço do backend no EasyPanel (ex: `http://projeto-api:3000`), não `http://backend:3000`.

---

## 🔧 Configurações Importantes

### Variáveis de Ambiente (.env.example)

```env
# Backend
DATABASE_URL=postgres://user:password@host:5432/dbname
JWT_SECRET=sua_chave_secreta_forte_aqui
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://seudominio.com

# EasyPanel Database (se usar serviço PostgreSQL do EasyPanel)
# DATABASE_URL=postgres://postgres:SENHA_GERADA@NOME_PROJETO-db:5432/NOME_PROJETO?sslmode=disable
```

### Rede Docker no EasyPanel

**Método Docker Compose**: Use rede interna bridge.
```yaml
networks:
  app-network:
    driver: bridge
```

**Método Serviços Separados**: Use rede `easypanel` (externa).
```yaml
networks:
  easypanel:
    external: true
```

### Healthcheck no Backend

Sempre incluir healthcheck no docker-compose:
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
  interval: 10s
  timeout: 5s
  retries: 5
```

E no código Express:
```javascript
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});
```

---

## 🐛 Troubleshooting Comum

### Erro 404 nas rotas /api/

**Causa**: O `proxy_pass` no Nginx remove ou mantém o prefixo `/api/` dependendo de como é configurado.

**Solução**: Certifique-se de que:
- No `nginx.conf`: `proxy_pass http://backend:3000;` (sem barra final → mantém `/api/`)
- No backend: As rotas são registradas COM o prefixo `/api/`:
  ```javascript
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  ```

**OU** use `proxy_pass http://backend:3000/;` (COM barra final → remove `/api/`) e no backend registre sem prefixo.

### CORS Errors

**Causa**: Backend rejeita requisições do domínio do frontend.

**Solução**:
```javascript
const cors = require('cors');
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
```

> ⚠️ Na produção com proxy Nginx, CORS geralmente não é problema porque frontend e API estão no mesmo domínio. Mas configure mesmo assim.

### Frontend não carrega após build

**Causa**: Vite build falha ou arquivos não foram copiados para Nginx.

**Solução**:
1. Testar build local: `cd frontend && npm run build`
2. Verificar que `dist/` é gerado
3. No Dockerfile, copiar de `/app/dist` (não `/app/src`)
4. Verificar que `nginx.conf` aponta `root` para `/usr/share/nginx/html`

### WebSocket / Connection Upgrade

Se usar WebSocket, adicionar no nginx:
```nginx
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection 'upgrade';
```

### Token JWT não chega ao backend

**Causa**: Nginx não repassa o header Authorization.

**Solução** no nginx.conf:
```nginx
proxy_set_header Authorization $http_authorization;
proxy_pass_header Authorization;
```

---

## ✅ Checklist Pré-Deploy

- [ ] `npm run build` (frontend) funciona sem erros
- [ ] `node src/server.js` (backend) inicia sem erros
- [ ] `docker compose -f docker-compose.prod.yml build` passa
- [ ] `.env.example` documenta TODAS as variáveis
- [ ] `nginx.conf` tem proxy correto para `/api/`
- [ ] Backend tem endpoint `/health`
- [ ] JWT_SECRET é uma string forte (não o default)
- [ ] DATABASE_URL aponta para o banco correto
- [ ] `.gitignore` inclui `.env`, `node_modules`, `dist`
- [ ] Nenhum secret hardcoded no código

## ✅ Checklist Pós-Deploy

- [ ] Domínio acessível (HTTPS automático pelo EasyPanel)
- [ ] Frontend carregando corretamente
- [ ] `/api/health` retornando 200
- [ ] Login/cadastro funcionando
- [ ] Dados sendo salvos no banco
- [ ] Sem erros nos logs do EasyPanel
- [ ] Healthcheck passando (verde no EasyPanel)
