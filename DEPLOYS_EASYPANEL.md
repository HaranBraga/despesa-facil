# Guia de Deploy no EasyPanel

O sistema Despesa Fácil foi configurado para ser facilmente hospedado utilizando o EasyPanel. 
Existem duas maneiras de subir o projeto:

## Método 1: Utilizando o "Docker Compose" nativo do EasyPanel (Recomendado)

O EasyPanel suporta aplicativos que rodam diretamente via Docker Compose, o que significa que o Banco de Dados, o Backend (API) e o Frontend (WebApp) irão rodar no mesmo projeto de forma isolada mas conectada.

1. Acesse o seu painel do **EasyPanel**.
2. Vá em **Projetos** e crie um novo ou selecione o projeto atual.
3. Clique em **Create Service** (Criar Serviço) -> **App**.
4. Defina um nome para sua aplicação, por exemplo: `despesa-facil`.
5. Vá na aba **Source** (Fonte) no canto superior.
6. Em vez de Github ou Docker Image, selecione **Docker Compose**.
7. Copie e cole todo o conteúdo do arquivo `docker-compose.prod.yml` que está na raiz do seu projeto local na caixa de texto do Compose do EasyPanel.
8. Troque algumas variáveis de ambiente essenciais lá mesmo (ou altere no arquivo antes de copiar):
   - Troque o `${JWT_SECRET}` por uma chave forte aleatória (ex: sua senha gerada pelo password generator).
   - Opcional: Recomendado em produção trocar a senha padrão do Postgres (`despesa123`).
9. Desça até o final da página e clique em **Save**, depois em **Deploy**.

**Como acessar o app após o Deploy desta forma?**
O EasyPanel irá gerar o serviço e automaticamente expor portas. Você precisará ir na aba **Domains** (Domínios) desse seu serviço Compose e criar uma rota (Route) que aponte para a porta `80` (que é a porta exposta do serviço \`frontend\`). Dessa forma, ao acessar aquele domínio, o Nginx interno redirecionará sua tela para a porta `80` (WebApp), e caso as requisições possuam o prefixo `/api/`, ele inteligentemente encaminhará para o seu serviço interno na porta `3000` (`backend`).

---

## Método 2: Criando 3 Serviços separadamente no EasyPanel

Caso você prefira separar cada piece do sistema no EasyPanel para análise de log individual:

1. **Subir o Database**:
   - Create Service -> **PostgreSQL**.
   - Digite as credenciais (DB Name: `despesa_facil`, User: `despesa`, Password: `<SUA_SENHA>`).
2. **Subir a API Backend**:
   - Create Service -> **App**. Nomeie como `despesa-api`.
   - Na aba **Source** selecione Github (ou a pasta do projeto se você subir imagem por CLI). Importante: Informe ao EasyPanel que o "Build Path" (Diretório) é `backend/` e o "Dockerfile Path" é `Dockerfile.prod`.
   - Na aba **Environment** defina:
     - `DATABASE_URL=postgresql://despesa:<SUA_SENHA>@<NOME_SERVICO_POSTGRES>:5432/despesa_facil`
     - `JWT_SECRET=<SUA_CHAVE_AQUI>`
     - `PORT=3000`
   - Na aba **Domains**, caso queira uma API publicamente acessível (se seu Frontend for hospedado externamente), adicione um domínio na porta 3000.
3. **Subir o Frontend Web App**:
   - Create Service -> **App**. Nomeie como `despesa-web`.
   - Na aba **Source**, defina o Path para `frontend/` e "Dockerfile Path" como `Dockerfile.prod`.
   - Na aba **Domains**, adicione o Domínio Principal para acessar a aplicação apontando para a porta `80`.

> Obs importante: No Método 2, ao invés de usar o Docker Compose e fazer o roteamento inteligente local, o Frontend *precisa saber* onde está o backend. Se não quiser proxy transparente, certifique-se de expor o App da API em um subdomínio próprio (ex: `api.despesafacil.com`) e usar proxy normal no Nginx. Pelo arquivo configurado, O NGINX dele espera se comunicar com `backend:3000`. Portanto, caso separe, modifique a tag `proxy_pass http://backend:3000/` dentro de `frontend/nginx.conf` para refletir o nome interno do seu app (Ex: `proxy_pass http://despesa-api:3000/`). O Método 1 é vastamente superior por agrupar tudo em um contexto fechado!
